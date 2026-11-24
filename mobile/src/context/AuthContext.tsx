import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';

import { authApi, setAuthToken, setUnauthorizedHandler, type LoginResult, type User } from '@/api';
import type { Role } from '@/data/types';
import { useBrand } from '@/context/AppConfigContext';
import { registerForPush } from '@/lib/push';

/**
 * Real sign-in against the Laravel API (Sanctum bearer token, docs/AUTHENTICATION.md).
 * The token lives only in SecureStore (Keychain / Keystore). Two-factor accounts get a
 * challenge first; unverified emails must enter the 6-digit code before using the app.
 */
const TOKEN_KEY = 'wd.token';
const BIOMETRIC_KEY = 'wd.biometric';

type Status = 'loading' | 'signedOut' | 'signedIn';
export type SignInOutcome = { twoFactor: true; challenge: string } | { twoFactor: false };
export type GoogleOutcome = { kind: 'signed_in' } | { kind: 'two_factor'; challenge: string } | { kind: 'signup'; token: string; name: string; email: string };

type Auth = {
  status: Status;
  user: User | null;
  role: Role | null;
  locked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  completeTwoFactor: (challenge: string, input: { code?: string; recovery_code?: string }) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<GoogleOutcome>;
  register: (input: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  setBiometricEnabled: (on: boolean) => void;
  unlock: () => Promise<boolean>;
};

const AuthContext = createContext<Auth | null>(null);

function roleOf(user: User | null): Role | null {
  if (!user) {
    return null;
  }
  return user.area === 'client' ? 'client' : user.area === 'firm' ? 'firm' : user.area === 'lawyer' ? 'lawyer' : null;
}

const deviceName = () => `${Device.modelName ?? Platform.OS} (${Platform.OS})`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const pushRegistered = useRef(false);
  const brandName = useBrand().name;

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    pushRegistered.current = false;
    setUserState(null);
    setStatus('signedOut');
  }, []);

  const accept = useCallback(async (result: LoginResult) => {
    if (result.two_factor) {
      return;
    }
    setAuthToken(result.token);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    setUserState(result.user);
    setStatus('signedIn');
  }, []);

  // Restore the session on launch.
  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession());
    (async () => {
      const [hasHardware, enrolled, savedBiometric, token] = await Promise.all([
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
        SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null),
        SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
      ]);
      setBiometricAvailable(hasHardware && enrolled);
      setBiometricEnabledState(savedBiometric === '1');

      if (!token) {
        setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        setUserState(await authApi.me());
        setLocked(savedBiometric === '1');
        setStatus('signedIn');
      } catch {
        await clearSession();
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Register this device for push once the account is usable.
  useEffect(() => {
    if (status === 'signedIn' && user?.email_verified && !pushRegistered.current) {
      pushRegistered.current = true;
      void registerForPush();
    }
  }, [status, user?.email_verified]);

  // Live counters (messages, notifications, appointment requests): every 30 s while the app is open,
  // when it returns to the foreground, and whenever a push arrives. The app icon badge shows the total.
  useEffect(() => {
    if (status !== 'signedIn') {
      void Notifications.setBadgeCountAsync(0).catch(() => undefined);
      return undefined;
    }
    const refresh = () => { void authApi.me().then(setUserState).catch(() => undefined); };
    const timer = setInterval(refresh, 30000);
    const appState = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    const received = Notifications.addNotificationReceivedListener(refresh);
    return () => { clearInterval(timer); appState.remove(); received.remove(); };
  }, [status]);

  useEffect(() => {
    const total = user ? user.unread.notifications + user.unread.messages + user.unread.appointments : 0;
    void Notifications.setBadgeCountAsync(total).catch(() => undefined);
  }, [user?.unread.notifications, user?.unread.messages, user?.unread.appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock again when the app goes to the background (if the user enabled biometrics).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && biometricEnabled && status === 'signedIn') {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, status]);

  const value = useMemo<Auth>(
    () => ({
      status,
      user,
      role: roleOf(user),
      locked,
      biometricAvailable,
      biometricEnabled,
      signIn: async (email, password) => {
        const { data } = await authApi.login(email.trim().toLowerCase(), password, deviceName());
        if (data.two_factor) {
          return { twoFactor: true, challenge: data.challenge_token };
        }
        await accept(data);
        return { twoFactor: false };
      },
      signInWithGoogle: async (idToken) => {
        const { data } = await authApi.google(idToken, deviceName());
        const d = data as Record<string, unknown>;
        if (d.google_signup) return { kind: 'signup', token: String(d.signup_token), name: String(d.name), email: String(d.email) };
        if (d.two_factor) return { kind: 'two_factor', challenge: String(d.challenge_token) };
        await accept(data as LoginResult);
        return { kind: 'signed_in' };
      },
      completeTwoFactor: async (challenge, input) => {
        const { data } = await authApi.twoFactor(challenge, input);
        await accept(data);
      },
      register: async (input) => {
        const { data } = await authApi.register({ ...input, device_name: deviceName() });
        await accept(data);
      },
      signOut: async () => {
        await authApi.logout().catch(() => undefined);
        await clearSession();
      },
      refreshUser: async () => {
        setUserState(await authApi.me());
      },
      setUser: setUserState,
      setBiometricEnabled: (on) => {
        setBiometricEnabledState(on);
        void SecureStore.setItemAsync(BIOMETRIC_KEY, on ? '1' : '0');
      },
      unlock: async () => {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Unlock ${brandName}`, fallbackLabel: 'Use passcode' }).catch(
          () => ({ success: false }) as LocalAuthentication.LocalAuthenticationResult,
        );
        if (result.success) {
          setLocked(false);
        }
        return result.success;
      },
    }),
    [status, user, locked, biometricAvailable, biometricEnabled, accept, clearSession, brandName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
