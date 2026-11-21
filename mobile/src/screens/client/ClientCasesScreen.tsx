import { View } from 'react-native';

import { clientApi } from '@/api';
import { Badge, Card, EmptyState, ErrorState, Screen, SkeletonCard, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientCasesScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const q = useQuery(() => clientApi.cases());

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>My cases</Txt>
      {q.loading ? <View style={{ gap: spacing.md }}><SkeletonCard /><SkeletonCard /></View> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.cases.length ? (
        <EmptyState icon="folder" title="No cases shared yet" message="When your lawyer shares a case with you it appears here with hearings and documents." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {q.data.cases.map((k) => (
            <Card key={k.id} onPress={() => nav.navigate('CaseDetail', { id: k.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Txt variant="subtitle" style={{ flex: 1 }} numberOfLines={2}>{k.title}</Txt>
                <Badge label={k.status_label} tone={statusTone(k.status)} />
              </View>
              <Txt variant="label" tone="muted" weight="500" style={{ marginTop: 4 }}>{[k.case_number, k.court].filter(Boolean).join(' · ')}</Txt>
              <Txt variant="caption" tone="faint" style={{ marginTop: 6 }}>{k.lawyers.join(', ')} · {k.organization}</Txt>
              {k.next_hearing_at ? <Txt variant="label" tone="accent" style={{ marginTop: spacing.sm }}>Next hearing: {new Date(k.next_hearing_at).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</Txt> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
