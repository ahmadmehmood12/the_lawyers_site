import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { fieldErrors, errorMessage } from '@/api';
import { Alert, Button, Input, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAuthNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';
import { AuthShell } from './AuthShell';

export function LoginScreen() {
  const nav = useAuthNavigation();
  const { signIn } = useAuth();
  const { spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const outcome = await signIn(email, password);
      if (outcome.twoFactor) {
        nav.navigate('TwoFactor', { challenge: outcome.challenge });
      }
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(fields);
      setMessage(Object.keys(fields).length ? null : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your cases, diary and consultations.">
      {message ? <Alert tone="danger" message={message} /> : null}
      <Input label="Email" icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.email} />
      <Input label="Password" icon="lock" value={password} onChangeText={setPassword} password autoComplete="password" error={errors.password} onSubmitEditing={() => void submit()} />
      <Pressable onPress={() => nav.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
        <Txt variant="label" tone="accent">Forgot password?</Txt>
      </Pressable>
      <Button title="Sign in" onPress={() => void submit()} loading={busy} disabled={!email || !password} full size="lg" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm }}>
        <Txt tone="muted">New to Wakeel Diary?</Txt>
        <Pressable onPress={() => nav.navigate('Register')} hitSlop={8}>
          <Txt weight="700" tone="primary">Create an account</Txt>
        </Pressable>
      </View>
    </AuthShell>
  );
}
