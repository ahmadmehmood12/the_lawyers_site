import { Feather } from '@expo/vector-icons';
import { type RouteProp, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Input, Screen, SectionHeader, Txt } from '@/components';
import { lawyers } from '@/data/mock';
import { formatPkrExact, weekday } from '@/lib/format';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type Mode = 'online' | 'in_person';

function nextDays(count: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const SLOTS = ['10:00', '11:30', '14:00', '16:00', '17:30'];

export function BookAppointmentScreen() {
  const { c, spacing, radius } = useTheme();
  const nav = useAppNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'BookAppointment'>>();
  const lw = lawyers.find((l) => l.id === params.lawyerId);

  const days = nextDays(10);
  const [date, setDate] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('online');
  const [purpose, setPurpose] = useState('');
  const [booked, setBooked] = useState(false);

  if (!lw) {
    return (
      <Screen>
        <EmptyState icon="user" title="Lawyer not found" />
      </Screen>
    );
  }

  if (booked) {
    return (
      <Screen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="check" size={40} color={c.success} />
        </View>
        <Txt variant="title" center style={{ marginTop: spacing.xl }}>
          Request sent
        </Txt>
        <Txt variant="body" tone="muted" center style={{ marginTop: spacing.sm, maxWidth: 300 }}>
          {lw.name} will confirm your {mode === 'online' ? 'online' : 'in-person'} consultation shortly. You’ll get a notification as soon as they respond.
        </Txt>
        <Button title="Back to home" icon="home" onPress={() => nav.popToTop()} full style={{ marginTop: spacing['2xl'] }} />
      </Screen>
    );
  }

  const canBook = !!slot;

  return (
    <Screen footer={<Button title="Confirm booking" icon="check" disabled={!canBook} onPress={() => setBooked(true)} full />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={lw.name} size={48} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="subtitle">{lw.name}</Txt>
            <Txt variant="caption" tone="muted">
              {lw.firm ?? lw.city} · {formatPkrExact(lw.consultationFee)}
            </Txt>
          </View>
        </View>
      </Card>

      <SectionHeader title="Select a date" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {days.map((d) => {
          const active = d === date;
          const day = new Date(d + 'T00:00:00').getDate();
          return (
            <Pressable
              key={d}
              onPress={() => setDate(d)}
              style={{ width: 58, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', backgroundColor: active ? c.primary : c.surface, borderWidth: 1, borderColor: active ? c.primary : c.border }}
            >
              <Txt variant="caption" style={{ color: active ? c.primaryText : c.textMuted }}>
                {weekday(d)}
              </Txt>
              <Txt variant="subtitle" style={{ color: active ? c.primaryText : c.text, marginTop: 2 }}>
                {day}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="Available times" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {SLOTS.map((s) => {
          const active = s === slot;
          const [h, m] = s.split(':').map(Number);
          const t12 = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
          return (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: active ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : c.border }}
            >
              <Txt variant="label" style={{ color: active ? c.accentText : c.text }}>
                {t12}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Consultation type" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {(['online', 'in_person'] as Mode[]).map((m) => {
          const active = m === mode;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{ flex: 1, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', backgroundColor: active ? c.primarySoft : c.surface, borderWidth: 1, borderColor: active ? c.primary : c.border }}
            >
              <Feather name={m === 'online' ? 'video' : 'map-pin'} size={22} color={active ? c.primary : c.textMuted} />
              <Txt variant="label" style={{ marginTop: spacing.sm, color: active ? c.primary : c.text }}>
                {m === 'online' ? 'Online' : 'In person'}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Reason for consultation" />
      <Input placeholder="Briefly describe your matter (optional)" value={purpose} onChangeText={setPurpose} multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />
    </Screen>
  );
}
