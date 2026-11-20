import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, Button, Card, ListRow, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Item = { icon: keyof typeof Feather.glyphMap; label: string; route: keyof RootStackParamList };

const MENU: Item[] = [
  { icon: 'user', label: 'Edit profile', route: 'EditProfile' },
  { icon: 'credit-card', label: 'Payments & invoices', route: 'Payments' },
  { icon: 'bell', label: 'Notifications', route: 'Notifications' },
  { icon: 'settings', label: 'Settings', route: 'Settings' },
];

export function ClientProfileScreen() {
  const { c, spacing } = useTheme();
  const { user, logout } = useAuth();
  const nav = useAppNavigation();

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <Avatar name={user?.name ?? 'Client'} size={84} />
        <Txt variant="subtitle" style={{ marginTop: spacing.md }}>
          {user?.name}
        </Txt>
        <Txt variant="caption" tone="muted">
          {user?.email}
        </Txt>
      </View>

      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        {MENU.map((m, i) => (
          <ListRow
            key={m.route}
            leading={
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={m.icon} size={17} color={c.primary} />
              </View>
            }
            title={m.label}
            chevron
            divider={i < MENU.length - 1}
            onPress={() => nav.navigate(m.route as never)}
          />
        ))}
      </Card>

      <Button title="Sign out" variant="secondary" icon="log-out" onPress={logout} full style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}
