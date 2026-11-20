import { Feather } from '@expo/vector-icons';
import { type RouteProp, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Avatar, Badge, Button, Card, EmptyState, KeyValue, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { appointments } from '@/data/mock';
import { formatPkrExact, formatDate, to12h, relativeDay } from '@/lib/format';
import { appointmentTone, label } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export function AppointmentDetailScreen() {
  const { c, spacing } = useTheme();
  const { user } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AppointmentDetail'>>();
  const base = appointments.find((a) => a.id === params.id);
  const [status, setStatus] = useState(base?.status);
  const isLawyer = user?.role !== 'client';

  if (!base) {
    return (
      <Screen>
        <EmptyState icon="calendar" title="Appointment not found" />
      </Screen>
    );
  }

  const counterpartName = isLawyer ? base.clientName : base.lawyerName;

  return (
    <Screen>
      <Card tone={status === 'confirmed' ? 'accent' : 'surface'}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={counterpartName} size={52} tone={isLawyer ? 'neutral' : 'primary'} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="subtitle">{counterpartName}</Txt>
            <Txt variant="caption" tone="muted">
              {isLawyer ? 'Client' : 'Advocate'}
            </Txt>
          </View>
          <Badge label={label(status ?? 'pending')} tone={appointmentTone(status ?? 'pending')} />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={base.mode === 'online' ? 'video' : 'map-pin'} size={22} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle">{relativeDay(base.date)}</Txt>
            <Txt variant="caption" tone="muted">
              {formatDate(base.date)} · {to12h(base.time)}
            </Txt>
          </View>
        </View>
        <KeyValue label="Mode" value={base.mode === 'online' ? 'Online (video call)' : 'In person, at chambers'} />
        <KeyValue label="Purpose" value={base.purpose} />
        <KeyValue label="Consultation fee" value={formatPkrExact(base.fee)} last />
      </Card>

      {status === 'confirmed' && base.mode === 'online' ? (
        <View style={{ marginTop: spacing.lg }}>
          <Alert tone="info" message="A secure video link will appear here 15 minutes before the appointment." />
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {isLawyer && status === 'pending' ? (
          <>
            <Button title="Accept appointment" icon="check" onPress={() => setStatus('confirmed')} full />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Decline" variant="secondary" icon="x" onPress={() => setStatus('cancelled')} style={{ flex: 1 }} />
              <Button title="Reschedule" variant="secondary" icon="clock" onPress={() => setStatus('rescheduled')} style={{ flex: 1 }} />
            </View>
          </>
        ) : null}
        {status === 'confirmed' ? (
          <>
            {base.mode === 'online' ? <Button title="Join video call" icon="video" full /> : <Button title="Get directions" icon="navigation" full />}
            <Button title="Reschedule" variant="secondary" icon="clock" onPress={() => setStatus('rescheduled')} full />
            <Button title="Cancel appointment" variant="ghost" onPress={() => setStatus('cancelled')} full />
          </>
        ) : null}
        {!isLawyer && status === 'pending' ? (
          <>
            <Alert tone="warning" message="Waiting for the advocate to confirm. You’ll be notified as soon as they respond." />
            <Button title="Cancel request" variant="secondary" icon="x" onPress={() => setStatus('cancelled')} full />
          </>
        ) : null}
        {status === 'completed' ? <Button title="Book a follow-up" icon="repeat" full /> : null}
      </View>
    </Screen>
  );
}
