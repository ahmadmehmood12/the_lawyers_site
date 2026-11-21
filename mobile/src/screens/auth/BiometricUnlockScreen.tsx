import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

/** Shown on relaunch when biometric lock is enabled; the app stays blurred until unlocked. */
export function BiometricUnlockScreen() {
  const { c, spacing, radius } = useTheme();
  const { unlock, signOut, user } = useAuth();

  useEffect(() => {
    // Prompt automatically the first time the lock screen appears.
    unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 88, height: 88, borderRadius: radius.xl, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="lock" size={40} color={c.primary} />
      </View>
      <Txt variant="title" style={{ marginTop: spacing.xl }}>
        Welcome back
      </Txt>
      <Txt variant="body" tone="muted" center style={{ marginTop: spacing.xs }}>
        {user?.name ?? 'Wakeel Diary'} is locked. Unlock with Face ID or your fingerprint to continue.
      </Txt>
      <View style={{ width: '100%', gap: spacing.md, marginTop: spacing['3xl'] }}>
        <Button title="Unlock" icon="unlock" onPress={() => void unlock()} full />
        <Button title="Sign out" variant="ghost" onPress={() => void signOut()} full />
      </View>
    </Screen>
  );
}
