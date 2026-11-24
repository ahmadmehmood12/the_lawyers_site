import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { workspaceApi } from '@/api';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Screen, SkeletonCard, Txt } from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

/** Cases visible to me (same filters and permissions as the web Cases page). */
export function WorkspaceCasesScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const term = useDebouncedValue(search, 350);
  const q = useQuery(() => workspaceApi.cases({ search: term, status }), [term, status]);
  const page = q.data?.cases;

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">Cases</Txt>
        <Button title="New case" icon="plus" size="sm" onPress={() => nav.navigate('CaseForm')} />
      </View>
      <View style={{ gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Input icon="search" placeholder="Title, number, FIR or client" value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label="Open" selected={status === 'open'} onPress={() => setStatus('open')} />
          <Chip label="All" selected={status === ''} onPress={() => setStatus('')} />
          {q.data?.options.statuses.map((s) => <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => setStatus(s.value)} />)}
        </ScrollView>
        {page ? <Txt variant="caption" tone="muted">{page.total} cases</Txt> : null}
      </View>
      {q.loading ? <View style={{ gap: spacing.md }}><SkeletonCard /><SkeletonCard /></View> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !page?.data.length ? <EmptyState icon="folder" title="No cases found" /> : (
        <View style={{ gap: spacing.md }}>
          {page.data.map((k) => (
            <Card key={k.id} onPress={() => nav.navigate('CaseDetail', { id: k.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Txt variant="caption" tone="accent" weight="700">{k.reference}</Txt>
                <Badge label={k.status_label} tone={statusTone(k.status)} />
              </View>
              <Txt variant="subtitle" numberOfLines={2} style={{ marginTop: 4 }}>{k.title}</Txt>
              <Txt variant="label" tone="muted" weight="500">{[k.case_type_label, k.case_number, k.court].filter(Boolean).join(' · ')}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                <Txt variant="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>{k.clients.join(', ')}</Txt>
                {k.next_hearing_at ? <Txt variant="caption" tone="accent">Next: {new Date(k.next_hearing_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</Txt> : null}
              </View>
            </Card>
          ))}
          {page.last_page > 1 ? <Txt variant="caption" tone="faint" center>Showing {page.data.length} of {page.total}. Refine the search to narrow down.</Txt> : null}
        </View>
      )}
    </Screen>
  );
}
