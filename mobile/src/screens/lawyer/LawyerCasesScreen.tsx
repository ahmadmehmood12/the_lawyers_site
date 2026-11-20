import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, Card, Chip, EmptyState, Input, ProgressBar, Screen, Txt } from '@/components';
import { cases, currentLawyerName } from '@/data/mock';
import type { CaseStatus } from '@/data/types';
import { relativeDay } from '@/lib/format';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

const FILTERS: { value: CaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'won', label: 'Won' },
  { value: 'closed', label: 'Closed' },
];

export function LawyerCasesScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');

  const list = cases
    .filter((cs) => cs.lawyers.includes(currentLawyerName))
    .filter((cs) => filter === 'all' || cs.status === filter)
    .filter((cs) => `${cs.title} ${cs.reference} ${cs.court}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Cases
      </Txt>
      <Input icon="search" placeholder="Search by title, number or court" value={query} onChangeText={setQuery} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </ScrollView>

      {list.length === 0 ? (
        <EmptyState icon="folder" title="No cases" message="No cases match this filter." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {list.map((cs) => (
            <Card key={cs.id} onPress={() => nav.navigate('CaseDetail', { id: cs.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt variant="caption" tone="faint">
                  {cs.reference}
                </Txt>
                <Badge label={label(cs.status)} tone={caseTone(cs.status)} />
              </View>
              <Txt variant="body" weight="600" style={{ marginTop: 4 }} numberOfLines={1}>
                {cs.title}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {cs.court} · {cs.clientName}
              </Txt>
              <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
                <ProgressBar value={cs.progress} tone={cs.status === 'won' ? 'success' : 'accent'} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="caption" tone="muted">
                  {cs.stage}
                </Txt>
                {cs.nextHearing ? (
                  <Txt variant="caption" tone="accent" weight="600">
                    {relativeDay(cs.nextHearing)}
                  </Txt>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
