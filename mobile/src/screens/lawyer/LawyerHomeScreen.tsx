import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppHeader, Badge, Button, Card, EmptyState, ListRow, Screen, SectionHeader, Stat, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { appointments, cases, currentLawyerName, hearings, invoices, tasks } from '@/data/mock';
import { formatPkr, relativeDay, to12h } from '@/lib/format';
import { label, priorityTone } from '@/lib/status';
import { useLawyerTabNavigation } from '@/navigation/tabs';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function LawyerHomeScreen() {
  const { c, spacing } = useTheme();
  const { user } = useAuth();
  const nav = useAppNavigation();
  const tabNav = useLawyerTabNavigation();

  const myCases = cases.filter((cs) => cs.lawyers.includes(currentLawyerName));
  const activeCases = myCases.filter((cs) => cs.status === 'active' || cs.status === 'pending');
  const myHearings = hearings.filter((h) => myCases.some((cs) => cs.id === h.caseId) && h.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
  const pendingAppointments = appointments.filter((a) => a.lawyerName === currentLawyerName && a.status === 'pending');
  const outstanding = invoices.reduce((n, i) => n + (i.amount - i.paid), 0);
  const myTasks = tasks.filter((t) => t.assignee === currentLawyerName && t.status !== 'done');

  return (
    <Screen>
      <AppHeader greeting="Good morning" name={user?.name ?? 'Advocate'} subtitle={user?.org} onNotifications={() => nav.navigate('Notifications')} unread />

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={activeCases.length} label="Active cases" icon="folder" />
          <Stat value={myHearings.length} label="Upcoming hearings" icon="calendar" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={pendingAppointments.length} label="Appointment requests" icon="clock" />
          <Stat value={formatPkr(outstanding)} label="Outstanding fees" icon="dollar-sign" deltaTone="danger" />
        </View>
      </View>

      <SectionHeader title="Today’s cause list" actionLabel="Diary" onAction={() => tabNav.navigate('LawyerCalendar')} />
      {myHearings.length === 0 ? (
        <EmptyState icon="calendar" title="No hearings scheduled" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {myHearings.slice(0, 3).map((h, i) => (
            <ListRow
              key={h.id}
              leading={
                <View style={{ width: 46, alignItems: 'center' }}>
                  <Txt variant="caption" tone="accent" weight="700">
                    {to12h(h.time).replace(' ', '')}
                  </Txt>
                </View>
              }
              title={h.caseTitle}
              subtitle={`${h.court} · ${h.purpose}`}
              meta={relativeDay(h.date)}
              divider={i < Math.min(myHearings.length, 3) - 1}
              chevron
              onPress={() => nav.navigate('CaseDetail', { id: h.caseId })}
            />
          ))}
        </Card>
      )}

      {pendingAppointments.length > 0 ? (
        <>
          <SectionHeader title="Appointment requests" actionLabel="All" onAction={() => tabNav.navigate('LawyerAppointments')} />
          <View style={{ gap: spacing.md }}>
            {pendingAppointments.map((a) => (
              <Card key={a.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="body" weight="600">
                    {a.clientName}
                  </Txt>
                  <Badge label="Pending" tone="warning" />
                </View>
                <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {relativeDay(a.date)}, {to12h(a.time)} · {a.mode === 'online' ? 'Online' : 'In person'}
                </Txt>
                <Txt variant="caption" tone="muted" style={{ marginTop: 4 }} numberOfLines={1}>
                  {a.purpose}
                </Txt>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title="Accept" size="sm" icon="check" onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} style={{ flex: 1 }} />
                  <Button title="View" size="sm" variant="secondary" onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} style={{ flex: 1 }} />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Tasks due" />
      {myTasks.length === 0 ? (
        <EmptyState icon="check-square" title="Nothing due" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {myTasks.map((t, i) => (
            <ListRow
              key={t.id}
              leading={<Feather name="circle" size={18} color={c.textFaint} />}
              title={t.title}
              subtitle={t.caseReference}
              trailing={<Badge label={label(t.priority)} tone={priorityTone(t.priority)} />}
              divider={i < myTasks.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
