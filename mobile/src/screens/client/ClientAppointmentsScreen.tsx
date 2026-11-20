import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Card, EmptyState, Screen, SegmentedControl, Txt } from '@/components';
import { appointments, currentClientId } from '@/data/mock';
import { formatDate, to12h } from '@/lib/format';
import { appointmentTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientAppointmentsScreen() {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const mine = appointments.filter((a) => a.clientId === currentClientId);
  const upcoming = mine.filter((a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'rescheduled');
  const past = mine.filter((a) => a.status === 'completed' || a.status === 'cancelled');
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        My appointments
      </Txt>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { value: 'past', label: `Past (${past.length})` },
        ]}
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {list.length === 0 ? (
          <EmptyState icon="calendar" title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'} message={tab === 'upcoming' ? 'Find a lawyer and book your first consultation.' : undefined} />
        ) : (
          list.map((a) => (
            <Card key={a.id} onPress={() => nav.navigate('AppointmentDetail', { id: a.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={a.lawyerName} size={46} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="body" weight="600">
                    {a.lawyerName}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="calendar" size={13} color={c.textMuted} />
                      <Txt variant="caption" tone="muted">
                        {formatDate(a.date)}, {to12h(a.time)}
                      </Txt>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name={a.mode === 'online' ? 'video' : 'map-pin'} size={13} color={c.textMuted} />
                      <Txt variant="caption" tone="muted">
                        {a.mode === 'online' ? 'Online' : 'In person'}
                      </Txt>
                    </View>
                  </View>
                </View>
                <Badge label={label(a.status)} tone={appointmentTone(a.status)} />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
