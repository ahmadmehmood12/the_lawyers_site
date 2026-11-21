import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { workspaceApi, type Hearing } from '@/api';
import { Card, EmptyState, ErrorState, Screen, SkeletonCard, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';
import { HearingRow } from './WorkspaceHomeScreen';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Court diary for one day (GET /workspace/diary?date=), with a week strip to jump between days. */
export function CourtDiaryScreen() {
  const nav = useAppNavigation();
  const { c, spacing, radius } = useTheme();
  const [date, setDate] = useState(() => new Date());
  const q = useQuery(() => workspaceApi.diary({ date: iso(date), view: 'day' }), [iso(date)]);
  const week = Array.from({ length: 7 }).map((_, i) => { const d = new Date(date); d.setDate(date.getDate() - date.getDay() + i); return d; });
  const shift = (days: number) => setDate((d) => { const n = new Date(d); n.setDate(d.getDate() + days); return n; });
  const hearings = (q.data?.hearings ?? []) as unknown as Hearing[];
  const entries = (q.data?.entries ?? []) as unknown as { id: number; title: string; notes?: string | null; time?: string | null }[];

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">Court diary</Txt>
        <Pressable onPress={() => setDate(new Date())} hitSlop={8}><Txt variant="label" tone="accent">Today</Txt></Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
        <Pressable onPress={() => shift(-7)} hitSlop={8}><Feather name="chevron-left" size={22} color={c.text} /></Pressable>
        <Txt variant="subtitle">{date.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</Txt>
        <Pressable onPress={() => shift(7)} hitSlop={8}><Feather name="chevron-right" size={22} color={c.text} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
        {week.map((d) => {
          const active = iso(d) === iso(date);
          const count = q.data?.monthCounts?.[iso(d)] ?? 0;
          return (
            <Pressable key={iso(d)} onPress={() => setDate(d)} style={{ width: 44, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: active ? c.primary : c.surfaceAlt }}>
              <Txt variant="caption" style={{ color: active ? c.primaryText : c.textMuted }}>{d.toLocaleDateString('en-PK', { weekday: 'short' }).slice(0, 2)}</Txt>
              <Txt variant="subtitle" style={{ color: active ? c.primaryText : c.text }}>{d.getDate()}</Txt>
              <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: count ? (active ? c.primaryText : c.accent) : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : hearings.length === 0 && entries.length === 0 ? (
          <EmptyState icon="calendar" title="Nothing on this day" message="Hearings and diary entries for the selected date appear here." />
        ) : (
          <>
            {hearings.map((h) => <HearingRow key={h.id} h={h} onPress={() => h.case && nav.navigate('CaseDetail', { id: h.case.id })} />)}
            {entries.map((e) => <Card key={`e${e.id}`}><Txt variant="subtitle">{e.title}</Txt>{e.notes ? <Txt tone="muted">{e.notes}</Txt> : null}</Card>)}
          </>
        )}
      </View>
    </Screen>
  );
}
