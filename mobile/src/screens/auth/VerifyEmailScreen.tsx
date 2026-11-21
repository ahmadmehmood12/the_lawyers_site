import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { authApi, errorMessage, fieldErrors } from '@/api';
import { Alert, Button, OtpInput, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { AuthShell } from './AuthShell';

/** Signed in but email not verified: enter the 6-digit code (same as the web verify page). */
export function VerifyEmailScreen() {
  const { user, setUser, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

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
      const { data } = await authApi.verifyEmail(value);
      setUser(data);
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
      const { message } = await authApi.resendVerification();
      setNotice(message);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell compact title="Verify your email" subtitle={`We sent a 6-digit code to ${user?.email ?? 'your email'}.`}>
      {notice ? <Alert tone="success" message={notice} /> : null}
      <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) { void verify(v); } }} error={error ?? undefined} />
      <Button title="Verify email" onPress={() => void verify()} loading={busy} disabled={code.length !== 6} full size="lg" />
      <Pressable onPress={() => void resend()} disabled={cooldown > 0} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone={cooldown > 0 ? 'faint' : 'accent'}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send a new code'}</Txt>
      </Pressable>
      <Pressable onPress={() => void signOut()} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone="muted">Sign out</Txt>
      </Pressable>
    </AuthShell>
  );
}
