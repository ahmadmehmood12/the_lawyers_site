import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { errorMessage, fieldErrors } from '@/api';
import { Alert, Button, Input, OtpInput, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAuthNavigation, type AuthStackParamList } from '@/navigation/types';
import { AuthShell } from './AuthShell';

/** Second sign-in step for accounts with two-factor authentication (authenticator or recovery code). */
export function TwoFactorScreen() {
  const { params } = useRoute<RouteProp<AuthStackParamList, 'TwoFactor'>>();
  const nav = useAuthNavigation();
  const { completeTwoFactor } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      await completeTwoFactor(params.challenge, useRecovery ? { recovery_code: value.trim() } : { code: value });
    } catch (e) {
      const fields = fieldErrors(e);
      if (fields.challenge_token) {
        nav.popToTop();
        return;
      }
      setError(fields.code ?? fields.recovery_code ?? errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell compact title="Two-step verification" subtitle={useRecovery ? 'Enter one of your saved recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}>
      {useRecovery ? (
        <Input label="Recovery code" icon="key" value={code} onChangeText={setCode} autoCapitalize="none" error={error ?? undefined} />
      ) : (
        <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) { void submit(v); } }} error={error ?? undefined} />
      )}
      {error && useRecovery ? <Alert tone="danger" message={error} /> : null}
      <Button title="Verify and sign in" onPress={() => void submit()} loading={busy} disabled={useRecovery ? !code.trim() : code.length !== 6} full size="lg" />
      <Pressable onPress={() => { setUseRecovery(!useRecovery); setCode(''); setError(null); }} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone="accent">{useRecovery ? 'Use authenticator code instead' : 'Use a recovery code'}</Txt>
      </Pressable>
    </AuthShell>
  );
}
