import { useState } from 'react';
import { View } from 'react-native';

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

export function RegisterScreen() {
  const { spacing } = useTheme();
  const { login } = useAuth();
  const nav = useAuthNavigation();
  const [role, setRole] = useState<Role>('client');
  const [loading, setLoading] = useState(false);

  const create = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(role);
    }, 700);
  };

  return (
    <Screen>
      <Txt variant="title">Create your account</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
        A single account for consultations, cases and payments.
      </Txt>

      <Txt variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
        I am a
      </Txt>
      <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />

      <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <Input label={role === 'firm' ? 'Firm name' : 'Full name'} icon="user" placeholder={role === 'firm' ? 'Tariq & Associates' : 'Your name'} />
        <Input label="Email" icon="mail" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Input label="Phone" icon="phone" placeholder="+92 3xx xxxxxxx" keyboardType="phone-pad" />
        {role === 'lawyer' ? <Input label="Bar enrolment number" icon="award" placeholder="LHC-2018-xxxx" hint="Used to verify your practice." /> : null}
        <Input label="Password" icon="lock" placeholder="Create a password" password />
        <Button title="Create account" icon="user-plus" loading={loading} onPress={create} full />
        <Button title="I already have an account" variant="ghost" onPress={() => nav.goBack()} full />
      </View>
    </Screen>
  );
}
