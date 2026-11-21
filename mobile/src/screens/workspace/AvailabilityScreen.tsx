import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { errorMessage, fieldErrors, workspaceApi, type AvailabilitySlot } from '@/api';
import { Alert, Button, Card, Chip, ErrorState, Input, Loading, Screen, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useTheme } from '@/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MODES: { value: AvailabilitySlot['mode']; label: string }[] = [{ value: 'both', label: 'Both' }, { value: 'in_person', label: 'In person' }, { value: 'online', label: 'Online' }];

/** Weekly consultation hours — clients can only book inside these windows. */
export function AvailabilityScreen() {
  const { c, spacing } = useTheme();
  const q = useQuery(() => workspaceApi.availability());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => { if (q.data) { setSlots(q.data.slots.map((s) => ({ ...s, starts_at: s.starts_at.slice(0, 5), ends_at: s.ends_at.slice(0, 5) }))); } }, [q.data]);

  if (q.loading) {
    return <Loading />;
  }
  if (q.error) {
    return <Screen><ErrorState message={q.error} onRetry={q.reload} /></Screen>;
  }

  const update = (i: number, patch: Partial<AvailabilitySlot>) => setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await workspaceApi.saveAvailability(slots.map(({ weekday, starts_at, ends_at, mode }) => ({ weekday, starts_at, ends_at, mode })));
      setNotice({ tone: 'success', text: 'Working hours saved.' });
    } catch (e) {
      const f = Object.values(fieldErrors(e))[0];
      setNotice({ tone: 'danger', text: f ?? errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Save hours" full size="lg" loading={busy} onPress={() => void save()} />}>
      <Txt tone="muted">Clients book 30-minute consultations inside these hours. Use 24-hour time (e.g. 09:00, 17:30).</Txt>
      {notice ? <View style={{ marginTop: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {DAYS.map((day, weekday) => {
          const rows = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.weekday === weekday);
          return (
            <Card key={day}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt variant="subtitle">{day}</Txt>
                <Pressable hitSlop={8} onPress={() => setSlots((l) => [...l, { weekday, starts_at: '10:00', ends_at: '13:00', mode: 'both' }])}>
                  <Feather name="plus-circle" size={20} color={c.primary} />
                </Pressable>
              </View>
              {rows.length === 0 ? <Txt variant="caption" tone="faint" style={{ marginTop: 4 }}>Not available</Txt> : rows.map(({ s, i }) => (
                <View key={i} style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}><Input value={s.starts_at} onChangeText={(v) => update(i, { starts_at: v })} placeholder="09:00" maxLength={5} /></View>
                    <Txt tone="muted">to</Txt>
                    <View style={{ flex: 1 }}><Input value={s.ends_at} onChangeText={(v) => update(i, { ends_at: v })} placeholder="17:00" maxLength={5} /></View>
                    <Pressable hitSlop={8} onPress={() => setSlots((l) => l.filter((_, j) => j !== i))}><Feather name="trash-2" size={18} color={c.danger} /></Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {MODES.map((m) => <Chip key={m.value} label={m.label} selected={s.mode === m.value} onPress={() => update(i, { mode: m.value })} />)}
                  </View>
                </View>
              ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
