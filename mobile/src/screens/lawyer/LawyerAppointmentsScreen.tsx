import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, Screen, SegmentedControl, Txt } from '@/components';
import { appointments, currentLawyerName } from '@/data/mock';
import type { AppointmentStatus } from '@/data/types';
import { formatDate, to12h } from '@/lib/format';
import { appointmentTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function LawyerAppointmentsScreen() {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  const [tab, setTab] = useState<'requests' | 'upcoming' | 'past'>('requests');
  const [overrides, setOverrides] = useState<Record<string, AppointmentStatus>>({});

  const mine = appointments
    .filter((a) => a.lawyerName === currentLawyerName)
    .map((a) => ({ ...a, status: overrides[a.id] ?? a.status }));

  const requests = mine.filter((a) => a.status === 'pending');
  const upcoming = mine.filter((a) => a.status === 'confirmed' || a.status === 'rescheduled');
  const past = mine.filter((a) => a.status === 'completed' || a.status === 'cancelled');
  const list = tab === 'requests' ? requests : tab === 'upcoming' ? upcoming : past;

  const set = (id: string, status: AppointmentStatus) => setOverrides((o) => ({ ...o, [id]: status }));

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Appointments
      </Txt>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'requests', label: `Requests (${requests.length})` },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
        ]}
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {list.length === 0 ? (
          <EmptyState icon="calendar" title={tab === 'requests' ? 'No pending requests' : tab === 'upcoming' ? 'Nothing upcoming' : 'No past appointments'} />
        ) : (
          list.map((a) => (
            <Card key={a.id} onPress={() => nav.navigate('AppointmentDetail', { id: a.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={a.clientName} size={44} tone="neutral" />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="body" weight="600">
                    {a.clientName}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="calendar" size={12} color={c.textMuted} />
                      <Txt variant="caption" tone="muted">
                        {formatDate(a.date)}, {to12h(a.time)}
                      </Txt>
                    </View>
                    <Feather name={a.mode === 'online' ? 'video' : 'map-pin'} size={13} color={c.textMuted} />
                  </View>
                </View>
                <Badge label={label(a.status)} tone={appointmentTone(a.status)} />
              </View>
              <Txt variant="caption" tone="muted" style={{ marginTop: spacing.sm }} numberOfLines={1}>
                {a.purpose}
              </Txt>
              {a.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title="Accept" size="sm" icon="check" onPress={() => set(a.id, 'confirmed')} style={{ flex: 1 }} />
                  <Button title="Reschedule" size="sm" variant="secondary" icon="clock" onPress={() => set(a.id, 'rescheduled')} style={{ flex: 1 }} />
                  <Button title="Decline" size="sm" variant="secondary" icon="x" onPress={() => set(a.id, 'cancelled')} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
