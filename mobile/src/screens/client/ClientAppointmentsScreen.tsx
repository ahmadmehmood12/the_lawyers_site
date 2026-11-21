import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { clientApi, errorMessage, type ClientAppointment } from '@/api';
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, ReasonSheet, Screen, SegmentedControl, SkeletonCard, SlotSheet, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useClientTabNavigation } from '@/navigation/tabs';
import { useTheme } from '@/theme';

/** My consultations: cancel or ask for a new time (the lawyer is notified exactly as on the web). */
export function ClientAppointmentsScreen() {
  const { c, spacing } = useTheme();
  const tabs = useClientTabNavigation();
  const q = useQuery(() => clientApi.appointments());
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<ClientAppointment | null>(null);
  const [moving, setMoving] = useState<ClientAppointment | null>(null);
  const [slots, setSlots] = useState<{ starts_at: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const all = q.data?.appointments ?? [];
  const open = (a: ClientAppointment) => ['requested', 'confirmed'].includes(a.status) && new Date(a.starts_at) > new Date();
  const list = all.filter((a) => (scope === 'upcoming' ? open(a) : !open(a)));

  const startMove = async (a: ClientAppointment) => {
    setMoving(a);
    setSlotsLoading(true);
    try {
      setSlots((await clientApi.slots(a.id)).slots);
    } finally {
      setSlotsLoading(false);
    }
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="title">Appointments</Txt>
      <View style={{ marginVertical: spacing.lg }}>
        <SegmentedControl value={scope} onChange={setScope} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'History' }]} />
      </View>
      {notice ? <View style={{ marginBottom: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      {q.loading ? <View style={{ gap: spacing.md }}><SkeletonCard /><SkeletonCard /></View> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : list.length === 0 ? (
        <EmptyState icon="calendar" title={scope === 'upcoming' ? 'No upcoming consultations' : 'Nothing here yet'} message="Book a consultation with a verified lawyer." actionLabel="Find a lawyer" onAction={() => tabs.navigate('FindLawyers')} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {list.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <Avatar name={a.lawyer} uri={a.lawyer_avatar} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{a.lawyer}</Txt>
                  <Txt variant="label" tone="muted" weight="500">
                    {new Date(a.starts_at).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Txt>
                </View>
                <Badge label={a.status_label} tone={statusTone(a.status)} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: spacing.sm }}>
                <Feather name={a.mode_value === 'online' ? 'video' : 'map-pin'} size={13} color={c.textMuted} />
                <Txt variant="caption" tone="muted">{a.mode}</Txt>
                {a.rescheduled_from ? <Txt variant="caption" tone="faint">· moved from {new Date(a.rescheduled_from).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</Txt> : null}
              </View>
              {a.cancellation_reason ? <Txt variant="caption" tone="danger" style={{ marginTop: 6 }}>Reason: {a.cancellation_reason}</Txt> : null}
              {a.meeting_link ? <Button title="Join meeting" icon="video" size="sm" variant="accent" style={{ marginTop: spacing.md }} onPress={() => void Linking.openURL(a.meeting_link!)} /> : null}
              {a.cancellable || a.reschedulable ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  {a.reschedulable ? <Button title="New time" icon="clock" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => void startMove(a)} /> : null}
                  {a.cancellable ? <Button title="Cancel" icon="x" size="sm" variant="ghost" style={{ flex: 1 }} onPress={() => setCancelling(a)} /> : null}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <ReasonSheet
        visible={!!cancelling}
        title="Cancel this consultation?"
        confirmLabel="Cancel consultation"
        danger
        onClose={() => setCancelling(null)}
        onSubmit={async (reason) => {
          try {
            const { message } = await clientApi.cancel(cancelling!.id, reason);
            setNotice({ tone: 'success', text: message });
            setCancelling(null);
            void q.refresh();
          } catch (e) {
            setNotice({ tone: 'danger', text: errorMessage(e) });
            setCancelling(null);
          }
        }}
      />
      <SlotSheet
        visible={!!moving}
        title="Request a new time"
        slots={slots}
        loading={slotsLoading}
        onClose={() => setMoving(null)}
        onSubmit={async (startsAt, reason) => {
          try {
            const { message } = await clientApi.reschedule(moving!.id, startsAt, reason || undefined);
            setNotice({ tone: 'success', text: message });
            void q.refresh();
          } catch (e) {
            setNotice({ tone: 'danger', text: errorMessage(e) });
          } finally {
            setMoving(null);
          }
        }}
      />
    </Screen>
  );
}
