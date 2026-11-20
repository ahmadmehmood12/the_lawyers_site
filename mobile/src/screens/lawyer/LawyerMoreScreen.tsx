import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, Button, Card, ListRow, Screen, SectionHeader, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Item = { icon: keyof typeof Feather.glyphMap; label: string; route: keyof RootStackParamList };

const PRACTICE: Item[] = [
  { icon: 'users', label: 'Clients', route: 'Clients' },
  { icon: 'file-text', label: 'Documents', route: 'Documents' },
  { icon: 'dollar-sign', label: 'Fees & payments', route: 'Finance' },
];
const ACCOUNT: Item[] = [
  { icon: 'clock', label: 'Availability & working hours', route: 'Availability' },
  { icon: 'bell', label: 'Notification preferences', route: 'NotificationPrefs' },
  { icon: 'user', label: 'Edit profile', route: 'EditProfile' },
  { icon: 'settings', label: 'Settings', route: 'Settings' },
];

function Menu({ items }: { items: Item[] }) {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
      {items.map((m, i) => (
        <ListRow
          key={m.route}
          leading={
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={m.icon} size={17} color={c.primary} />
            </View>
          }
          title={m.label}
          chevron
          divider={i < items.length - 1}
          onPress={() => nav.navigate(m.route as never)}
        />
      ))}
    </Card>
  );
}

export function LawyerMoreScreen() {
  const { spacing } = useTheme();
  const { user, logout } = useAuth();
  const nav = useAppNavigation();

  return (
    <Screen>
      <Card onPress={() => nav.navigate('EditProfile')}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={user?.name ?? 'Advocate'} size={56} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="subtitle">{user?.name}</Txt>
            <Txt variant="caption" tone="muted">
              {user?.org ?? 'Advocate, High Court'}
            </Txt>
          </View>
          <Feather name="chevron-right" size={20} color="#9aa" />
        </View>
      </Card>

      <SectionHeader title="Practice" />
      <Menu items={PRACTICE} />

      <SectionHeader title="Account" />
      <Menu items={ACCOUNT} />

      <Button title="Sign out" variant="secondary" icon="log-out" onPress={logout} full style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}
