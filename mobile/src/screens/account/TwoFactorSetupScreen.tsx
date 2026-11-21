import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { accountApi, errorMessage, fieldErrors } from '@/api';
import { Alert, Button, Card, Input, Loading, OtpInput, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { useTheme } from '@/theme';

type Step = 'idle' | 'password' | 'scan' | 'codes' | 'disable';

/** Turn two-factor on (password → key/QR in an authenticator app → confirm code → recovery codes) or off. */
export function TwoFactorSetupScreen() {
  const { refreshUser } = useAuth();
  const { c, spacing, radius } = useTheme();
  const status = useQuery(() => accountApi.twoFactor());
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(Object.values(fieldErrors(e))[0] ?? errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (status.loading) {
    return <Loading />;
  }
  const enabled = status.data?.enabled;

  return (
    <Screen edges={[]}>
      <Card tone={enabled ? 'primary' : 'surface'}>
        <Txt variant="subtitle" tone={enabled ? 'inverse' : 'default'}>{enabled ? 'Two-factor authentication is on' : 'Protect your account'}</Txt>
        <Txt tone={enabled ? 'inverse' : 'muted'} style={{ marginTop: 4, opacity: enabled ? 0.85 : 1 }}>
          After your password you'll also enter a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy).
        </Txt>
      </Card>
      {error ? <View style={{ marginTop: spacing.md }}><Alert tone="danger" message={error} /></View> : null}

      <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        {step === 'idle' && !enabled ? <Button title="Set up two-factor" icon="shield" full onPress={() => setStep('password')} /> : null}
        {step === 'idle' && enabled ? (
          <>
            <Button title="Show recovery codes" icon="key" variant="secondary" full onPress={() => setStep('codes')} />
            <Button title="Turn off two-factor" icon="shield-off" variant="ghost" full onPress={() => setStep('disable')} />
          </>
        ) : null}

        {step === 'password' || step === 'disable' || (step === 'codes' && !codes.length) ? (
          <>
            <Input label="Confirm your password" icon="lock" password value={password} onChangeText={setPassword} />
            <Button
              title={step === 'disable' ? 'Turn off' : step === 'codes' ? 'Show codes' : 'Continue'}
              variant={step === 'disable' ? 'danger' : 'primary'}
              full
              loading={busy}
              disabled={!password}
              onPress={() => void run(async () => {
                if (step === 'password') {
                  const { data } = await accountApi.enableTwoFactor(password);
                  setSecret(data);
                  setStep('scan');
                } else if (step === 'codes') {
                  setCodes((await accountApi.recoveryCodes(password)).data.recovery_codes);
                } else {
                  await accountApi.disableTwoFactor(password);
                  await refreshUser();
                  await status.reload();
                  setStep('idle');
                }
                setPassword('');
              })}
            />
          </>
        ) : null}

        {step === 'scan' && secret ? (
          <>
            <Txt variant="label">1. Add this key to your authenticator app</Txt>
            <View style={{ padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
              <Txt variant="subtitle" center selectable style={{ letterSpacing: 2 }}>{secret.secret.replace(/(.{4})/g, '$1 ').trim()}</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Copy key" icon="copy" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => void Clipboard.setStringAsync(secret.secret)} />
              <Button title="Open app" icon="external-link" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(secret.otpauth_url).catch(() => undefined)} />
            </View>
            <Txt variant="label">2. Enter the 6-digit code it shows</Txt>
            <OtpInput value={code} onChange={setCode} />
            <Button title="Confirm and turn on" full loading={busy} disabled={code.length !== 6} onPress={() => void run(async () => {
              const { data } = await accountApi.confirmTwoFactor(code);
              setCodes(data.recovery_codes);
              await refreshUser();
              await status.reload();
              setStep('codes');
            })} />
          </>
        ) : null}

        {step === 'codes' && codes.length ? (
          <>
            <Alert tone="warning" title="Save these recovery codes" message="Each code signs you in once if you lose your phone. Keep them somewhere safe." />
            <Card>{codes.map((r) => <Txt key={r} selectable style={{ fontVariant: ['tabular-nums'], paddingVertical: 3 }}>{r}</Txt>)}</Card>
            <Button title="Copy all" icon="copy" variant="secondary" full onPress={() => void Clipboard.setStringAsync(codes.join('\n'))} />
            <Button title="Done" full onPress={() => { setCodes([]); setStep('idle'); }} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
