import { View } from 'react-native';

import { Card, Screen, SectionHeader, Stat, Txt } from '@/components';
import { cases, invoices } from '@/data/mock';
import { formatPkr } from '@/lib/format';
import { useTheme } from '@/theme';

const REVENUE = [
  { month: 'Jun', value: 210 },
  { month: 'Jul', value: 180 },
  { month: 'Aug', value: 320 },
  { month: 'Sep', value: 260 },
  { month: 'Oct', value: 390 },
  { month: 'Nov', value: 300 },
];

export function AnalyticsScreen() {
  const { c, spacing } = useTheme();
  const maxRev = Math.max(...REVENUE.map((r) => r.value));

  const areas = [
    { label: 'Family', pct: 32 },
    { label: 'Civil & property', pct: 26 },
    { label: 'Criminal', pct: 18 },
    { label: 'Corporate & tax', pct: 14 },
    { label: 'Other', pct: 10 },
  ];

  const won = cases.filter((x) => x.status === 'won').length;
  const decided = cases.filter((x) => x.status === 'won' || x.status === 'lost' || x.status === 'closed').length || 1;

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Analytics
      </Txt>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={`${Math.round((won / decided) * 100)}%`} label="Success rate" deltaTone="success" />
        <Stat value={formatPkr(invoices.reduce((n, i) => n + i.paid, 0))} label="Collected" />
      </View>

      <SectionHeader title="Revenue (Rs, thousands)" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: spacing.sm }}>
          {REVENUE.map((r) => (
            <View key={r.month} style={{ flex: 1, alignItems: 'center' }}>
              <Txt variant="caption" tone="faint" style={{ marginBottom: 4 }}>
                {r.value}
              </Txt>
              <View style={{ width: '70%', height: (r.value / maxRev) * 100, backgroundColor: c.primary, borderRadius: 6 }} />
              <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>
                {r.month}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Caseload by practice area" />
      <Card>
        <View style={{ gap: spacing.md }}>
          {areas.map((a) => (
            <View key={a.label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Txt variant="caption" tone="muted">
                  {a.label}
                </Txt>
                <Txt variant="caption" weight="700">
                  {a.pct}%
                </Txt>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ width: `${a.pct * 3}%`, maxWidth: '100%', height: '100%', backgroundColor: c.accent, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
