import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Card, EmptyState, Screen, SegmentedControl, Txt } from '@/components';
import { appointments } from '@/data/mock';
import { formatDate, to12h } from '@/lib/format';
import { appointmentTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function FirmAppointmentsScreen() {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  const [tab, setTab] = useState<'all' | 'pending'>('all');

  const list = tab === 'pending' ? appointments.filter((a) => a.status === 'pending') : appointments;

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Appointments
      </Txt>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: `All (${appointments.length})` },
          { value: 'pending', label: `Pending (${appointments.filter((a) => a.status === 'pending').length})` },
        ]}
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {list.length === 0 ? (
          <EmptyState icon="calendar" title="No appointments" />
        ) : (
          list.map((a) => (
            <Card key={a.id} onPress={() => nav.navigate('AppointmentDetail', { id: a.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt variant="body" weight="600">
                  {a.lawyerName}
                </Txt>
                <Badge label={label(a.status)} tone={appointmentTone(a.status)} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Feather name="user" size={12} color={c.textFaint} />
                <Txt variant="caption" tone="muted">
                  {a.clientName}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="calendar" size={12} color={c.textFaint} />
                  <Txt variant="caption" tone="faint">
                    {formatDate(a.date)}, {to12h(a.time)}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name={a.mode === 'online' ? 'video' : 'map-pin'} size={12} color={c.textFaint} />
                  <Txt variant="caption" tone="faint">
                    {a.mode === 'online' ? 'Online' : 'In person'}
                  </Txt>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
