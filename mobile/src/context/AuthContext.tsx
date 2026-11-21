import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';

import { authApi, setAuthToken, setUnauthorizedHandler, type LoginResult, type User } from '@/api';
import type { Role } from '@/data/types';
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

type Auth = {
  status: Status;
  user: User | null;
  role: Role | null;
  locked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  completeTwoFactor: (challenge: string, input: { code?: string; recovery_code?: string }) => Promise<void>;
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
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Wakeel Diary', fallbackLabel: 'Use passcode' }).catch(
          () => ({ success: false }) as LocalAuthentication.LocalAuthenticationResult,
        );
        if (result.success) {
          setLocked(false);
        }
        return result.success;
      },
    }),
    [status, user, locked, biometricAvailable, biometricEnabled, accept, clearSession],
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
