import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Avatar, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Tile = { icon: keyof typeof Feather.glyphMap; label: string; to: keyof RootStackParamList; badge?: number; show?: boolean };

/** "More" tab: every module that is not in the bottom bar, as a tile grid (the web sidebar on mobile). */
export function MoreScreen() {
  const nav = useAppNavigation();
  const { user, role } = useAuth();
  const { c, spacing, radius } = useTheme();
  if (!user) return null;
  const perms = user.organization?.permissions ?? [];
  const can = (p: string) => perms.includes(p);

  const tiles: Tile[] = role === 'client'
    ? [
        { icon: 'folder', label: 'My cases', to: 'MyCases' },
        { icon: 'file', label: 'Documents', to: 'Documents' },
        { icon: 'file-text', label: 'Invoices', to: 'Invoices' },
        { icon: 'book', label: 'Judgments', to: 'Judgments' },
        { icon: 'heart', label: 'Saved lawyers', to: 'Favourites' },
        { icon: 'bell', label: 'Notifications', to: 'Notifications', badge: user.unread.notifications },
      ]
    : [
        { icon: 'calendar', label: 'Appointments', to: 'Appointments', badge: user.unread.appointments },
        { icon: 'users', label: 'Clients', to: 'Clients', show: can('clients.view') },
        { icon: 'check-square', label: 'Tasks', to: 'Tasks' },
        { icon: 'file', label: 'Documents', to: 'Documents', show: can('documents.view') },
        { icon: 'edit-3', label: 'Drafting', to: 'Drafts', show: can('drafts.manage') || can('drafts.view') },
        { icon: 'file-text', label: 'Invoices', to: 'WorkspaceInvoices', show: can('finance.view') },
        { icon: 'zap', label: 'AI assistant', to: 'Ai', show: can('ai.use') },
        { icon: 'book', label: 'Judgments', to: 'Judgments' },
        { icon: 'briefcase', label: 'Team', to: 'Team', show: user.organization?.type === 'firm' },
        { icon: 'clock', label: 'Consultation hours', to: 'Availability', show: user.account_type === 'lawyer' },
        { icon: 'bell', label: 'Notifications', to: 'Notifications', badge: user.unread.notifications },
      ];

  return (
    <Screen>
      <Pressable onPress={() => nav.navigate('Account')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }}>
        <Avatar name={user.name} uri={user.avatar_url} size={52} />
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle">{user.name}</Txt>
          <Txt variant="caption" tone="muted">{user.organization?.name ?? user.email}</Txt>
        </View>
        <Txt variant="label" tone="accent">Account</Txt>
        <Feather name="chevron-right" size={18} color={c.textFaint} />
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
        {tiles.filter((t) => t.show !== false).map((t) => (
          <Pressable key={t.label} onPress={() => nav.navigate(t.to as never)} style={{ width: '30.5%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={t.icon} size={22} color={c.primary} />
            </View>
            <Txt variant="label" center numberOfLines={2}>{t.label}</Txt>
            {t.badge ? <View style={{ position: 'absolute', top: 8, right: 8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Txt variant="caption" style={{ color: '#fff', fontSize: 11 }}>{t.badge > 99 ? '99+' : t.badge}</Txt></View> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
