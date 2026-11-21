import { useRoute, type RouteProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { clientApi, directoryApi, errorMessage, fieldErrors } from '@/api';
import { Alert, Button, Card, Chip, EmptyState, ErrorState, Input, Loading, Screen, SectionHeader, Txt, groupByDay, timeLabel } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { formatPkr } from '@/lib/format';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

/** Book a 30-minute consultation from the lawyer's free slots (same rules as the website). */
export function BookAppointmentScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'BookAppointment'>>();
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const q = useQuery(() => directoryApi.slots(params.slug), [params.slug]);
  const days = useMemo(() => groupByDay(q.data?.slots ?? []), [q.data]);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (q.loading) {
    return <Loading label="Finding free times…" />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const activeDay = day ?? days[0]?.key ?? null;
  const current = days.find((d) => d.key === activeDay);
  const chosenMode = mode ?? q.data.modes[0]?.value ?? null;

  const book = async () => {
    if (!slot || !chosenMode) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { message: ok } = await clientApi.book(params.slug, { starts_at: slot, mode: chosenMode, message: message.trim() || undefined });
      setDone(ok);
    } catch (e) {
      const f = fieldErrors(e);
      setError(f.starts_at ?? f.mode ?? errorMessage(e));
      if (f.starts_at) {
        setSlot(null);
        void q.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <EmptyState icon="check-circle" title="Request sent" message={done} actionLabel="View my appointments" onAction={() => nav.navigate('ClientTabs', { screen: 'ClientAppointments' } as never)} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} footer={<Button title={slot ? `Request ${timeLabel(slot)}` : 'Choose a time'} full size="lg" disabled={!slot || !chosenMode} loading={busy} onPress={() => void book()} />}>
      <Card>
        <Txt variant="subtitle">{q.data.lawyer.name}</Txt>
        <Txt tone="muted">30-minute consultation · {q.data.lawyer.fee ? formatPkr(q.data.lawyer.fee) : 'Fee on request'}</Txt>
      </Card>
      {!q.data.lawyer.accepting ? <View style={{ marginTop: spacing.lg }}><Alert tone="warning" message="This lawyer is not accepting new clients right now." /></View> : null}
      {error ? <View style={{ marginTop: spacing.lg }}><Alert tone="danger" message={error} /></View> : null}

      <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}>
        <SectionHeader title="Consultation type" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {q.data.modes.map((m) => <Chip key={m.value} icon={m.value === 'online' ? 'video' : 'map-pin'} label={m.label} selected={chosenMode === m.value} onPress={() => setMode(m.value)} />)}
        </View>
      </View>

      <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}>
        <SectionHeader title="Pick a day" />
        {days.length === 0 ? <EmptyState icon="calendar" title="No free times" message="This lawyer has no open slots in the next two weeks." /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {days.map((d) => <Chip key={d.key} label={d.label} selected={d.key === activeDay} onPress={() => { setDay(d.key); setSlot(null); }} />)}
            </ScrollView>
            <SectionHeader title="Pick a time" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {current?.slots.map((s) => <Chip key={s} label={timeLabel(s)} selected={slot === s} onPress={() => setSlot(s)} />)}
            </View>
          </>
        )}
      </View>

      <View style={{ marginTop: spacing['2xl'] }}>
        <Input label="Message to the lawyer (optional)" value={message} onChangeText={setMessage} multiline maxLength={2000} placeholder="Briefly describe your matter" style={{ minHeight: 90, textAlignVertical: 'top' }} />
      </View>
    </Screen>
  );
}
