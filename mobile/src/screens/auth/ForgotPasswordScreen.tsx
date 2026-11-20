import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Button, Input, Screen, Txt } from '@/components';
import { useAuthNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ForgotPasswordScreen() {
  const { spacing } = useTheme();
  const nav = useAuthNavigation();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 650);
  };

  return (
    <Screen>
      <Txt variant="title">Reset your password</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
        Enter your email and we’ll send a secure reset link.
      </Txt>

      {sent ? (
        <View style={{ gap: spacing.lg }}>
          <Alert tone="success" title="Check your inbox" message="If an account exists for that email, a password reset link is on its way. It expires in 60 minutes." />
          <Button title="Back to sign in" icon="arrow-left" onPress={() => nav.goBack()} full />
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <Input label="Email" icon="mail" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          <Button title="Send reset link" icon="send" loading={loading} onPress={submit} full />
          <Button title="Cancel" variant="ghost" onPress={() => nav.goBack()} full />
        </View>
      )}
    </Screen>
  );
}
