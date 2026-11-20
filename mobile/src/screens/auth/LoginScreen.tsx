import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Input, Screen, SegmentedControl, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/data/types';
import { useAuthNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'firm', label: 'Law firm' },
];

export function LoginScreen() {
  const { c, spacing, radius } = useTheme();
  const { login, biometricAvailable, unlock } = useAuth();
  const nav = useAuthNavigation();
  const [role, setRole] = useState<Role>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(role);
    }, 650);
  };

  const biometric = async () => {
    const ok = await unlock();
    if (ok) {
      login(role);
    }
  };

  return (
    <Screen padded contentStyle={{ paddingTop: spacing['3xl'] }}>
      <View style={{ alignItems: 'center', marginBottom: spacing['3xl'] }}>
        <View style={{ width: 72, height: 72, borderRadius: radius.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="shield" size={34} color={c.primaryText} />
        </View>
        <Txt variant="title" style={{ marginTop: spacing.lg }}>
          Wakeel Diary
        </Txt>
        <Txt variant="body" tone="muted" center style={{ marginTop: spacing.xs }}>
          Pakistan’s legal practice, in your pocket
        </Txt>
      </View>

      <Txt variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
        Sign in as
      </Txt>
      <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />

      <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <Input label="Email" icon="mail" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="Password" icon="lock" placeholder="••••••••" password value={password} onChangeText={setPassword} />
        <Pressable onPress={() => nav.navigate('ForgotPassword')} hitSlop={6} style={{ alignSelf: 'flex-end' }}>
          <Txt variant="caption" tone="accent" weight="600">
            Forgot password?
          </Txt>
        </Pressable>
        <Button title="Sign in" icon="log-in" loading={loading} onPress={signIn} full />
        {biometricAvailable ? (
          <Button title="Unlock with Face ID / fingerprint" icon="smartphone" variant="secondary" onPress={biometric} full />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing['2xl'] }}>
        <Txt variant="body" tone="muted">
          New here?{' '}
        </Txt>
        <Pressable onPress={() => nav.navigate('Register')} hitSlop={6}>
          <Txt variant="body" tone="accent" weight="700">
            Create an account
          </Txt>
        </Pressable>
      </View>

      <Txt variant="caption" tone="faint" center style={{ marginTop: spacing['3xl'] }}>
        Prototype — pick a role and sign in to explore. No real credentials needed.
      </Txt>
    </Screen>
  );
}
