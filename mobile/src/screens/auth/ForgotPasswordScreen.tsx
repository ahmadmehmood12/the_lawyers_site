import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { authApi, errorMessage, fieldErrors } from '@/api';
import { Alert, Button, Input, OtpInput, Txt } from '@/components';
import { useAuthNavigation, type AuthStackParamList } from '@/navigation/types';
import { AuthShell } from './AuthShell';

/** Step 1: email → a 6-digit reset code is emailed (same flow as the website). */
export function ForgotPasswordScreen() {
  const nav = useAuthNavigation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await authApi.forgotPassword(email.trim());
      nav.navigate('ResetCode', { email: data.email });
    } catch (e) {
      setError(fieldErrors(e).email ?? errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell compact title="Forgot password" subtitle="We'll email you a 6-digit code to reset it.">
      <Input label="Email" icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={error ?? undefined} />
      <Button title="Send code" onPress={() => void submit()} loading={busy} disabled={!email.includes('@')} full size="lg" />
      <Pressable onPress={() => nav.goBack()} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone="accent">Back to sign in</Txt>
      </Pressable>
    </AuthShell>
  );
}

/** Step 2: the emailed code → a reset token. */
export function ResetCodeScreen() {
  const { params } = useRoute<RouteProp<AuthStackParamList, 'ResetCode'>>();
  const nav = useAuthNavigation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(`Code sent to ${params.email}`);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await authApi.verifyResetCode(params.email, value);
      nav.replace('NewPassword', { email: data.email, token: data.reset_token });
    } catch (e) {
      setError(fieldErrors(e).code ?? errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setCooldown(60);
    try {
      await authApi.forgotPassword(params.email);
      setNotice('A new code is on its way.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell compact title="Check your email" subtitle="Enter the 6-digit code. It expires in 10 minutes.">
      {notice ? <Alert tone="success" message={notice} /> : null}
      <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) { void verify(v); } }} error={error ?? undefined} />
      <Button title="Verify code" onPress={() => void verify()} loading={busy} disabled={code.length !== 6} full size="lg" />
      <Pressable onPress={() => void resend()} disabled={cooldown > 0} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone={cooldown > 0 ? 'faint' : 'accent'}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</Txt>
      </Pressable>
    </AuthShell>
  );
}

/** Step 3: choose a new password (all signed-in devices are signed out). */
export function NewPasswordScreen() {
  const { params } = useRoute<RouteProp<AuthStackParamList, 'NewPassword'>>();
  const nav = useAuthNavigation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      await authApi.resetPassword({ token: params.token, email: params.email, password, password_confirmation: confirm });
      setDone(true);
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(Object.keys(fields).length ? fields : { password: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell compact title="New password" subtitle={params.email}>
      {done ? (
        <>
          <Alert tone="success" title="Password changed" message="Sign in with your new password." />
          <Button title="Back to sign in" onPress={() => nav.popToTop()} full size="lg" />
        </>
      ) : (
        <>
          <Input label="New password" icon="lock" value={password} onChangeText={setPassword} password error={errors.password ?? errors.email} hint="At least 8 characters with letters and numbers." />
          <Input label="Confirm password" icon="lock" value={confirm} onChangeText={setConfirm} password error={errors.password_confirmation} />
          <Button title="Save password" onPress={() => void submit()} loading={busy} disabled={!password || password !== confirm} full size="lg" />
        </>
      )}
    </AuthShell>
  );
}
