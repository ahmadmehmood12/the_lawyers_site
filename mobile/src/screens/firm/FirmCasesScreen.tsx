import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, EmptyState, Input, Screen, Txt } from '@/components';
import { cases } from '@/data/mock';
import type { CaseStatus } from '@/data/types';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

const FILTERS: { value: CaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'won', label: 'Won' },
];

export function FirmCasesScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');

  const list = cases
    .filter((cs) => filter === 'all' || cs.status === filter)
    .filter((cs) => `${cs.title} ${cs.reference} ${cs.lawyers.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Txt variant="title">Cases</Txt>
        <Button title="Assign" size="sm" icon="plus" onPress={() => nav.navigate('AssignCase')} />
      </View>
      <Input icon="search" placeholder="Search by title, number or lawyer" value={query} onChangeText={setQuery} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </ScrollView>

      {list.length === 0 ? (
        <EmptyState icon="folder" title="No cases" />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
                {cs.lawyers.map((lwName, idx) => (
                  <View key={lwName} style={{ marginLeft: idx === 0 ? 0 : -10 }}>
                    <Avatar name={lwName} size={26} tone="neutral" />
                  </View>
                ))}
                <Txt variant="caption" tone="muted" style={{ marginLeft: spacing.sm }}>
                  {cs.lawyers.join(', ')}
                </Txt>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
