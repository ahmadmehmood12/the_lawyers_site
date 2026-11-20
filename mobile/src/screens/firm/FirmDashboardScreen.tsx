import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppHeader, Avatar, Badge, Card, ListRow, ProgressBar, Screen, SectionHeader, Stat, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { appointments, cases, invoices, team } from '@/data/mock';
import { formatPkr } from '@/lib/format';
import { useFirmTabNavigation } from '@/navigation/tabs';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function FirmDashboardScreen() {
  const { c, spacing } = useTheme();
  const { user } = useAuth();
  const nav = useAppNavigation();
  const tabNav = useFirmTabNavigation();

  const active = cases.filter((cs) => cs.status === 'active' || cs.status === 'pending').length;
  const received = invoices.reduce((n, i) => n + i.paid, 0);
  const pendingAppts = appointments.filter((a) => a.status === 'pending').length;
  const lawyers = team.filter((m) => m.role === 'lawyer' || m.role === 'associate');

  const byStatus = [
    { label: 'Active', count: cases.filter((c2) => c2.status === 'active').length, tone: c.primary },
    { label: 'Pending', count: cases.filter((c2) => c2.status === 'pending').length, tone: c.warning },
    { label: 'On hold', count: cases.filter((c2) => c2.status === 'on_hold').length, tone: c.textFaint },
    { label: 'Won', count: cases.filter((c2) => c2.status === 'won').length, tone: c.success },
  ];
  const maxCount = Math.max(...byStatus.map((s) => s.count), 1);

  return (
    <Screen>
      <AppHeader greeting="Chambers overview" name={user?.org ?? 'Law firm'} subtitle={`${team.length} members`} onNotifications={() => nav.navigate('Notifications')} unread />

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={cases.length} label="Total cases" delta={`${active} active`} deltaTone="success" icon="folder" />
          <Stat value={formatPkr(received)} label="Received (2026)" icon="trending-up" deltaTone="success" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={lawyers.length} label="Lawyers" icon="users" />
          <Stat value={pendingAppts} label="Pending appts" icon="clock" />
        </View>
      </View>

      <SectionHeader title="Cases by status" />
      <Card>
        <View style={{ gap: spacing.md }}>
          {byStatus.map((s) => (
            <View key={s.label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Txt variant="caption" tone="muted">
                  {s.label}
                </Txt>
                <Txt variant="caption" weight="700">
                  {s.count}
                </Txt>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', backgroundColor: s.tone, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Team workload" actionLabel="Team" onAction={() => tabNav.navigate('FirmTeam')} />
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        {lawyers.map((m, i) => (
          <ListRow
            key={m.id}
            leading={<Avatar name={m.name} size={40} tone="neutral" />}
            title={m.name}
            subtitle={m.designation}
            trailing={<Badge label={`${m.activeCases} cases`} tone="info" />}
            divider={i < lawyers.length - 1}
            chevron
            onPress={() => nav.navigate('TeamMemberDetail', { id: m.id })}
          />
        ))}
      </Card>

      <SectionHeader title="Collection rate" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Txt variant="caption" tone="muted">
            Received vs billed
          </Txt>
          <Txt variant="label">{Math.round((received / invoices.reduce((n, i) => n + i.amount, 0)) * 100)}%</Txt>
        </View>
        <ProgressBar value={(received / invoices.reduce((n, i) => n + i.amount, 0)) * 100} tone="success" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
          <Feather name="info" size={13} color={c.textFaint} />
          <Txt variant="caption" tone="faint">
            {formatPkr(invoices.reduce((n, i) => n + i.amount, 0) - received)} still outstanding across {invoices.filter((i) => i.status !== 'paid').length} invoices.
          </Txt>
        </View>
      </Card>
    </Screen>
  );
}
