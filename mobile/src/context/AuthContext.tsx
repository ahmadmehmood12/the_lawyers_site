import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Role } from '@/data/types';

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  org?: string;
  avatar?: string | null;
};

/** The person each role signs in as in the prototype. */
const DEMO_USERS: Record<Role, SessionUser> = {
  client: { name: 'Imran Yousaf', email: 'imran.yousaf@example.com', role: 'client', avatar: null },
  lawyer: { name: 'Ayesha Tariq', email: 'ayesha@tariqlaw.pk', role: 'lawyer', org: 'Tariq & Associates', avatar: null },
  firm: { name: 'Tariq & Associates', email: 'office@tariqlaw.pk', role: 'firm', org: 'Tariq & Associates', avatar: null },
};

type Auth = {
  user: SessionUser | null;
  locked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (role: Role) => void;
  logout: () => void;
  setBiometricEnabled: (on: boolean) => void;
  lock: () => void;
  unlock: () => Promise<boolean>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (active) {
        setBiometricAvailable(hasHardware && enrolled);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<Auth>(
    () => ({
      user,
      locked,
      biometricAvailable,
      biometricEnabled,
      login: (role: Role) => {
        setUser(DEMO_USERS[role]);
        setLocked(false);
      },
      logout: () => {
        setUser(null);
        setLocked(false);
      },
      setBiometricEnabled,
      lock: () => setLocked(true),
      unlock: async () => {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Wakeel Diary',
          fallbackLabel: 'Use passcode',
        }).catch(() => ({ success: false }) as LocalAuthentication.LocalAuthenticationResult);
        if (result.success) {
          setLocked(false);
        }
        return result.success;
      },
    }),
    [user, locked, biometricAvailable, biometricEnabled],
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
