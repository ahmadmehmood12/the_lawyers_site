import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppHeader, Badge, Card, ProgressBar, Screen, SectionHeader, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { appointments, cases, currentClientId, hearings, notifications } from '@/data/mock';
import { formatDate, relativeDay, to12h } from '@/lib/format';
import { caseTone, label } from '@/lib/status';
import { useClientTabNavigation } from '@/navigation/tabs';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

const QUICK = [
  { icon: 'search' as const, label: 'Find a lawyer', tab: 'FindLawyers' as const },
  { icon: 'calendar' as const, label: 'My appointments', tab: 'ClientAppointments' as const },
  { icon: 'folder' as const, label: 'My cases', tab: 'ClientCases' as const },
];

export function ClientHomeScreen() {
  const { c, spacing, radius } = useTheme();
  const { user } = useAuth();
  const nav = useAppNavigation();
  const tabNav = useClientTabNavigation();

  const myCases = cases.filter((cs) => cs.clientId === currentClientId);
  const myAppointments = appointments.filter((a) => a.clientId === currentClientId && (a.status === 'confirmed' || a.status === 'pending')).sort((a, b) => a.date.localeCompare(b.date));
  const nextAppointment = myAppointments[0];
  const myHearings = hearings.filter((h) => myCases.some((cs) => cs.id === h.caseId) && h.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
  const nextHearing = myHearings[0];
  const unread = notifications.some((n) => !n.read);

  return (
    <Screen>
      <AppHeader greeting="Assalam o alaikum" name={user?.name ?? 'Client'} subtitle="Here’s what’s coming up" onNotifications={() => nav.navigate('Notifications')} unread={unread} />

      {nextAppointment ? (
        <Card tone="primary" onPress={() => nav.navigate('AppointmentDetail', { id: nextAppointment.id })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="caption" style={{ color: c.primaryText, opacity: 0.8 }}>
              Next appointment
            </Txt>
            <Badge label={label(nextAppointment.status)} tone={nextAppointment.status === 'confirmed' ? 'success' : 'warning'} />
          </View>
          <Txt variant="subtitle" style={{ color: c.primaryText, marginTop: spacing.sm }}>
            {nextAppointment.lawyerName}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="calendar" size={14} color={c.primaryText} />
              <Txt variant="caption" style={{ color: c.primaryText }}>
                {relativeDay(nextAppointment.date)}, {to12h(nextAppointment.time)}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name={nextAppointment.mode === 'online' ? 'video' : 'map-pin'} size={14} color={c.primaryText} />
              <Txt variant="caption" style={{ color: c.primaryText }}>
                {nextAppointment.mode === 'online' ? 'Online' : 'In person'}
              </Txt>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        {QUICK.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => tabNav.navigate(q.tab)}
            style={({ pressed }) => [{ flex: 1, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={q.icon} size={18} color={c.accentText} />
            </View>
            <Txt variant="caption" weight="600" center style={{ marginTop: spacing.sm }}>
              {q.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {nextHearing ? (
        <>
          <SectionHeader title="Upcoming hearing" />
          <Card onPress={() => nav.navigate('CaseDetail', { id: nextHearing.caseId })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="calendar" size={22} color={c.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="body" weight="600">
                  {nextHearing.caseTitle}
                </Txt>
                <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {nextHearing.court} · {formatDate(nextHearing.date)}, {to12h(nextHearing.time)}
                </Txt>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeader title="My cases" actionLabel={myCases.length > 2 ? 'See all' : undefined} onAction={() => tabNav.navigate('ClientCases')} />
      <View style={{ gap: spacing.md }}>
        {myCases.slice(0, 2).map((cs) => (
          <Card key={cs.id} onPress={() => nav.navigate('CaseDetail', { id: cs.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt variant="caption" tone="faint">
                {cs.reference}
              </Txt>
              <Badge label={label(cs.status)} tone={caseTone(cs.status)} />
            </View>
            <Txt variant="body" weight="600" style={{ marginTop: 4 }} numberOfLines={1}>
              {cs.title}
            </Txt>
            <Txt variant="caption" tone="muted" style={{ marginTop: 2, marginBottom: spacing.sm }}>
              {cs.court} · {cs.stage}
            </Txt>
            <ProgressBar value={cs.progress} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
