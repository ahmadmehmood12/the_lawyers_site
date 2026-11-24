import { View } from 'react-native';

import { webPage } from '@/api';
import { Alert, Card, ErrorState, Loading, Screen, SectionHeader, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { formatPkr } from '@/lib/format';
import { useTheme } from '@/theme';

type Point = { label: string; value: number };
type Analytics = {
  planAllows: boolean;
  upgrade: { message: string; next?: { name: string; price_monthly: number } } | null;
  totals: { active: number; closed: number; upcoming: number; openTasks: number; overdueTasks: number };
  registrations: Point[]; hearingsHeld: Point[]; byCourt: Point[]; byStatus: Point[]; workload: Point[];
  finance: { revenue: Point[]; expenses: Point[]; outstanding: number; outstandingCount: number } | null;
};

/** Practice analytics (web Analytics page, Workspace\AnalyticsController) — same numbers and plan gate. */
export function AnalyticsScreen() {
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<Analytics>('/workspace/analytics'));
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const d = q.data;

  if (!d.planAllows) {
    return (
      <Screen edges={[]}>
        <Alert tone="warning" title="Analytics is on a higher plan" message={`${d.upgrade?.message ?? 'Upgrade to see practice analytics.'}${d.upgrade?.next ? ` Available on ${d.upgrade.next.name} (PKR ${d.upgrade.next.price_monthly.toLocaleString()}/month).` : ''}`} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {[['Active cases', d.totals.active], ['Closed cases', d.totals.closed], ['Upcoming hearings', d.totals.upcoming], ['Open tasks', d.totals.openTasks], ['Overdue tasks', d.totals.overdueTasks]].map(([l, v]) => (
          <Card key={l as string} style={{ width: '48.5%' }}><Txt variant="title">{v as number}</Txt><Txt variant="caption" tone="muted">{l as string}</Txt></Card>
        ))}
      </View>
      <Section title="New cases per month"><Columns data={d.registrations} /></Section>
      <Section title="Hearings held per month"><Columns data={d.hearingsHeld} tone="accent" /></Section>
      {d.finance ? (
        <Section title="Revenue vs expenses">
          <Columns data={d.finance.revenue} compare={d.finance.expenses} money />
          <Txt variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>Outstanding: {formatPkr(d.finance.outstanding)} on {d.finance.outstandingCount} invoices</Txt>
        </Section>
      ) : null}
      <Section title="Open cases by court"><Bars data={d.byCourt} /></Section>
      <Section title="Cases by status"><Bars data={d.byStatus} /></Section>
      <Section title="Workload by lawyer"><Bars data={d.workload} /></Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ marginTop: spacing.xl, gap: spacing.sm }}><SectionHeader title={title} /><Card>{children}</Card></View>;
}

/** Monthly columns (optionally a second series side by side, e.g. expenses). */
function Columns({ data, compare, tone, money }: { data: Point[]; compare?: Point[]; tone?: 'accent'; money?: boolean }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((p) => p.value), ...(compare ?? []).map((p) => p.value));
  if (!data.length) return <Txt tone="muted">No data yet.</Txt>;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6 }}>
        {data.map((p, i) => (
          <View key={p.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <Txt variant="caption" tone="faint" style={{ fontSize: 9 }}>{money ? '' : p.value || ''}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: '85%' }}>
              <View style={{ width: compare ? 7 : 14, height: `${(p.value / max) * 100}%`, minHeight: p.value ? 3 : 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: tone === 'accent' ? c.accent : c.primary }} />
              {compare ? <View style={{ width: 7, height: `${((compare[i]?.value ?? 0) / max) * 100}%`, minHeight: compare[i]?.value ? 3 : 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: c.danger }} /> : null}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {data.map((p) => <Txt key={p.label} variant="caption" tone="faint" center style={{ flex: 1, fontSize: 9 }} numberOfLines={1}>{p.label}</Txt>)}
      </View>
      {compare ? <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>■ Revenue  <Txt variant="caption" tone="danger">■ Expenses</Txt></Txt> : null}
    </View>
  );
}

/** Horizontal bars for category breakdowns. */
function Bars({ data }: { data: Point[] }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((p) => p.value));
  if (!data.length) return <Txt tone="muted">No data yet.</Txt>;
  return (
    <View style={{ gap: 10 }}>
      {data.map((p) => (
        <View key={p.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>{p.label}</Txt><Txt variant="label" tone="muted">{p.value}</Txt></View>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: c.surfaceAlt, marginTop: 4 }}><View style={{ height: 7, borderRadius: 4, width: `${(p.value / max) * 100}%`, backgroundColor: c.primary }} /></View>
        </View>
      ))}
    </View>
  );
}
