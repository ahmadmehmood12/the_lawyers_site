import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { errorMessage, workspaceApi, type WorkspaceAppointment } from '@/api';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, ReasonSheet, Screen, SegmentedControl, SkeletonCard, SlotSheet, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

type Scope = 'requests' | 'upcoming' | 'past';

/**
 * Consultation requests and the diary of appointments. Accept / decline / cancel / complete /
 * no-show / reschedule go through AppointmentService on the server, so the client receives the
 * same email, WhatsApp, in-app and push messages as when the lawyer acts on the website.
 */
export function WorkspaceAppointmentsScreen() {
  const nav = useAppNavigation();
  const { c, spacing } = useTheme();
  const [scope, setScope] = useState<Scope>('requests');
  const q = useQuery(() => workspaceApi.appointments(scope), [scope]);
  const [reasonFor, setReasonFor] = useState<{ a: WorkspaceAppointment; status: 'declined' | 'cancelled' } | null>(null);
  const [moving, setMoving] = useState<WorkspaceAppointment | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const act = async (fn: () => Promise<{ message: string }>, id: number) => {
    setBusy(id);
    try {
      const { message } = await fn();
      setNotice({ tone: 'success', text: message });
      void q.refresh();
    } catch (e) {
      setNotice({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  // Lawyers may move to any future half hour; offer the next 14 days of working-day slots.
  const freeTimes = (): { starts_at: string }[] => {
    const out: { starts_at: string }[] = [];
    const now = new Date();
    for (let d = 0; d < 14; d++) {
      for (let h = 9; h < 18; h++) {
        for (const m of [0, 30]) {
          const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m);
          if (t > now) {
            out.push({ starts_at: t.toISOString() });
          }
        }
      }
    }
    return out;
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">Appointments</Txt>
        <Button title="Hours" icon="clock" size="sm" variant="secondary" onPress={() => nav.navigate('Availability')} />
      </View>
      <View style={{ marginVertical: spacing.lg }}>
        <SegmentedControl<Scope> value={scope} onChange={setScope} options={[{ value: 'requests', label: 'Requests' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      </View>
      {notice ? <View style={{ marginBottom: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      {q.loading ? <View style={{ gap: spacing.md }}><SkeletonCard /><SkeletonCard /></View> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.items.length ? (
        <EmptyState icon="inbox" title={scope === 'requests' ? 'No pending requests' : 'Nothing here'} message={scope === 'requests' ? 'New consultation requests from clients appear here.' : undefined} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {q.data.items.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{a.contact_name ?? 'Client'}</Txt>
                  <Txt variant="label" tone="muted" weight="500">{new Date(a.starts_at).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Txt>
                </View>
                <Badge label={a.status_label} tone={statusTone(a.status)} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                <Txt variant="caption" tone="muted"><Feather name={a.mode === 'online' ? 'video' : 'map-pin'} size={12} /> {a.mode_label}</Txt>
                {a.contact_phone ? <Txt variant="caption" tone="accent" onPress={() => void Linking.openURL(`tel:${a.contact_phone}`)}><Feather name="phone" size={12} /> {a.contact_phone}</Txt> : null}
                <Txt variant="caption" tone="faint">with {a.lawyer}</Txt>
              </View>
              {a.client_message ? <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: 10, backgroundColor: c.surfaceAlt }}><Txt variant="label" weight="400" tone="muted">“{a.client_message}”</Txt></View> : null}
              {a.cancellation_reason ? <Txt variant="caption" tone="danger" style={{ marginTop: 6 }}>Reason: {a.cancellation_reason}</Txt> : null}

              {a.status === 'requested' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title="Accept" icon="check" size="sm" style={{ flex: 1 }} loading={busy === a.id} onPress={() => void act(() => workspaceApi.transition(a.id, 'confirmed'), a.id)} />
                  <Button title="Decline" icon="x" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setReasonFor({ a, status: 'declined' })} />
                </View>
              ) : null}
              {a.status === 'confirmed' ? (
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  {a.meeting_link ? <Button title="Join meeting" icon="video" size="sm" variant="accent" onPress={() => void Linking.openURL(a.meeting_link!)} /> : null}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {new Date(a.starts_at) <= new Date() ? (
                      <>
                        <Button title="Completed" icon="check-circle" size="sm" style={{ flex: 1 }} loading={busy === a.id} onPress={() => void act(() => workspaceApi.transition(a.id, 'completed'), a.id)} />
                        <Button title="No-show" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => void act(() => workspaceApi.transition(a.id, 'no_show'), a.id)} />
                      </>
                    ) : (
                      <>
                        <Button title="Reschedule" icon="clock" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setMoving(a)} />
                        <Button title="Cancel" size="sm" variant="ghost" style={{ flex: 1 }} onPress={() => setReasonFor({ a, status: 'cancelled' })} />
                      </>
                    )}
                  </View>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <ReasonSheet
        visible={!!reasonFor}
        title={reasonFor?.status === 'declined' ? 'Decline this request?' : 'Cancel this appointment?'}
        confirmLabel={reasonFor?.status === 'declined' ? 'Decline' : 'Cancel appointment'}
        danger
        onClose={() => setReasonFor(null)}
        onSubmit={async (reason) => {
          const target = reasonFor!;
          setReasonFor(null);
          await act(() => workspaceApi.transition(target.a.id, target.status, reason), target.a.id);
        }}
      />
      <SlotSheet
        visible={!!moving}
        title="Move appointment"
        slots={moving ? freeTimes() : []}
        onClose={() => setMoving(null)}
        onSubmit={async (startsAt, reason) => {
          const target = moving!;
          setMoving(null);
          await act(() => workspaceApi.reschedule(target.id, startsAt, reason || undefined), target.id);
        }}
      />
    </Screen>
  );
}
