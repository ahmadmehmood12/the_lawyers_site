import { Feather } from '@expo/vector-icons';
import { Switch, View } from 'react-native';

import { Avatar, Badge, BrandFooter, Card, ListRow, Screen, SegmentedControl, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme, type ThemeMode } from '@/theme';

type Item = { icon: keyof typeof Feather.glyphMap; title: string; to: keyof RootStackParamList; subtitle?: string };

/** Profile / "More" tab for every role: role links, security, notifications, appearance, sign out. */
export function AccountScreen() {
  const nav = useAppNavigation();
  const { user, role, signOut, biometricAvailable, biometricEnabled, setBiometricEnabled } = useAuth();
  const { c, spacing, mode, setMode } = useTheme();
  if (!user) {
    return null;
  }
  const perms = user.organization?.permissions ?? [];

  const roleItems: Item[] = role === 'client'
    ? [{ icon: 'heart', title: 'Saved lawyers', to: 'Favourites' }, { icon: 'file-text', title: 'Invoices & payments', to: 'Invoices' }]
    : [
        ...(perms.includes('clients.view') ? [{ icon: 'users' as const, title: 'Clients', to: 'Clients' as const }] : []),
        { icon: 'book', title: 'Court diary', to: 'Diary' },
        ...(user.organization?.type === 'firm' ? [{ icon: 'users' as const, title: 'Team', to: 'Team' as const }] : []),
        ...(user.account_type === 'lawyer' ? [{ icon: 'clock' as const, title: 'Consultation hours', to: 'Availability' as const }] : []),
        ...(user.lawyer_profile_slug ? [{ icon: 'eye' as const, title: 'My public profile', to: 'LawyerProfile' as const }] : []),
      ];

  const security: Item[] = [
    { icon: 'user', title: 'Edit profile', to: 'EditProfile' },
    { icon: 'lock', title: 'Change password', to: 'ChangePassword' },
    { icon: 'shield', title: 'Two-factor authentication', to: 'TwoFactorSetup', subtitle: user.two_factor_enabled ? 'On' : 'Off' },
    { icon: 'bell', title: 'Notification settings', to: 'NotificationPrefs' },
  ];

  const go = (item: Item) => (item.to === 'LawyerProfile' ? nav.navigate('LawyerProfile', { slug: user.lawyer_profile_slug! }) : nav.navigate(item.to as never));

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Avatar name={user.name} uri={user.avatar_url} size={84} />
        <Txt variant="title" center>{user.name}</Txt>
        <Txt tone="muted">{user.email}</Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Badge label={role === 'client' ? 'Client' : role === 'firm' ? 'Law firm' : 'Advocate'} tone="accent" />
          {user.organization ? <Badge label={user.organization.name} /> : null}
        </View>
      </View>

      {roleItems.length ? <Group title="My practice" items={roleItems} onPress={go} /> : null}
      <Group title="Account & security" items={security} onPress={go} />

      <Txt variant="label" tone="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>PREFERENCES</Txt>
      <Card>
        <Txt variant="label" style={{ marginBottom: spacing.sm }}>Appearance</Txt>
        <SegmentedControl<ThemeMode> value={mode} onChange={setMode} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        {biometricAvailable ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Txt variant="label">Unlock with biometrics</Txt>
              <Txt variant="caption" tone="muted">Ask for Face ID / fingerprint when reopening the app</Txt>
            </View>
            <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} trackColor={{ true: c.primary, false: c.borderStrong }} />
          </View>
        ) : null}
      </Card>

      <Card padded={false} style={{ marginTop: spacing.xl }}>
        <ListRow title="Notifications" leading={<Feather name="inbox" size={18} color={c.text} />} onPress={() => nav.navigate('Notifications')} chevron divider />
        <ListRow title="Sign out" leading={<Feather name="log-out" size={18} color={c.danger} />} onPress={() => void signOut()} />
      </Card>
      <BrandFooter />
    </Screen>
  );
}

function Group({ title, items, onPress }: { title: string; items: Item[]; onPress: (i: Item) => void }) {
  const { c, spacing } = useTheme();
  return (
    <>
      <Txt variant="label" tone="muted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>{title.toUpperCase()}</Txt>
      <Card padded={false}>
        {items.map((i, n) => <ListRow key={i.title} title={i.title} meta={i.subtitle} leading={<Feather name={i.icon} size={18} color={c.primary} />} onPress={() => onPress(i)} chevron divider={n < items.length - 1} />)}
      </Card>
    </>
  );
}
