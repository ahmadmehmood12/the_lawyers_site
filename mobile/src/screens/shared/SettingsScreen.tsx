import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Divider, Screen, SectionHeader, SegmentedControl, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemeMode } from '@/theme';

function Row({ icon, label, right }: { icon: keyof typeof Feather.glyphMap; label: string; right?: ReactNode }) {
  const { c, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
      <Feather name={icon} size={18} color={c.textMuted} style={{ width: 28 }} />
      <Txt variant="body" style={{ flex: 1 }}>
        {label}
      </Txt>
      {right}
    </View>
  );
}

export function SettingsScreen() {
  const { c, spacing, mode, setMode } = useTheme();
  const { biometricAvailable, biometricEnabled, setBiometricEnabled, logout, user } = useAuth();

  return (
    <Screen>
      <Txt variant="title">Settings</Txt>

      <SectionHeader title="Appearance" />
      <Card>
        <Txt variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
          Theme
        </Txt>
        <SegmentedControl<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
        <Divider style={{ marginVertical: spacing.sm }} />
        <Row
          icon="globe"
          label="Language"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt variant="caption" tone="muted">
                English
              </Txt>
              <Feather name="chevron-right" size={16} color={c.textFaint} />
            </View>
          }
        />
      </Card>

      <SectionHeader title="Security" />
      <Card>
        <Row
          icon="shield"
          label="Face ID / fingerprint unlock"
          right={
            <Switch
              value={biometricEnabled}
              disabled={!biometricAvailable}
              onValueChange={setBiometricEnabled}
              trackColor={{ true: c.accent, false: c.borderStrong }}
              thumbColor="#fff"
            />
          }
        />
        <Divider />
        <Row icon="lock" label="Change password" right={<Feather name="chevron-right" size={16} color={c.textFaint} />} />
        {!biometricAvailable ? (
          <Txt variant="caption" tone="faint" style={{ marginTop: spacing.xs }}>
            No biometrics enrolled on this device.
          </Txt>
        ) : null}
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <Row icon="bell" label="Push notifications" right={<Switch value trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />} />
        <Divider />
        <Row icon="mail" label="Email alerts" right={<Switch value trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />} />
        <Divider />
        <Row icon="message-square" label="WhatsApp alerts" right={<Switch value={false} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />} />
      </Card>

      <SectionHeader title="About" />
      <Card>
        <Row icon="file-text" label="Terms of service" right={<Feather name="chevron-right" size={16} color={c.textFaint} />} />
        <Divider />
        <Row icon="help-circle" label="Help & support" right={<Feather name="chevron-right" size={16} color={c.textFaint} />} />
        <Divider />
        <Row icon="info" label="Version" right={<Txt variant="caption" tone="faint">1.0.0 (1)</Txt>} />
      </Card>

      <Button title="Sign out" variant="secondary" icon="log-out" onPress={logout} full style={{ marginTop: spacing.xl }} />
      <Txt variant="caption" tone="faint" center style={{ marginTop: spacing.md }}>
        Signed in as {user?.email}
      </Txt>
    </Screen>
  );
}
