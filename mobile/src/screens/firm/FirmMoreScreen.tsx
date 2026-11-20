import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, Button, Card, ListRow, Screen, SectionHeader, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Item = { icon: keyof typeof Feather.glyphMap; label: string; route: keyof RootStackParamList };

const MANAGE: Item[] = [
  { icon: 'users', label: 'Clients', route: 'Clients' },
  { icon: 'calendar', label: 'Court diary', route: 'Diary' },
  { icon: 'dollar-sign', label: 'Finance & invoices', route: 'Finance' },
  { icon: 'bar-chart-2', label: 'Analytics', route: 'Analytics' },
];
const FIRM: Item[] = [
  { icon: 'shield', label: 'Roles & permissions', route: 'RolesPermissions' },
  { icon: 'settings', label: 'Firm settings', route: 'Settings' },
  { icon: 'user', label: 'Edit profile', route: 'EditProfile' },
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

export function FirmMoreScreen() {
  const { spacing } = useTheme();
  const { user, logout } = useAuth();

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={user?.org ?? 'Firm'} size={56} tone="accent" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="subtitle">{user?.org}</Txt>
            <Txt variant="caption" tone="muted">
              {user?.email}
            </Txt>
          </View>
        </View>
      </Card>

      <SectionHeader title="Manage" />
      <Menu items={MANAGE} />

      <SectionHeader title="Firm" />
      <Menu items={FIRM} />

      <Button title="Sign out" variant="secondary" icon="log-out" onPress={logout} full style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}
