import { View } from 'react-native';

import { clientApi } from '@/api';
import { Badge, Card, EmptyState, ErrorState, Screen, SkeletonCard, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { formatPkrExact } from '@/lib/format';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function InvoicesScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const q = useQuery(() => clientApi.invoices());
  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.invoices.length ? <EmptyState icon="file-text" title="No invoices" /> : (
        <View style={{ gap: spacing.md }}>
          {q.data.invoices.map((i) => (
            <Card key={i.id} onPress={() => nav.navigate('InvoiceDetail', { id: i.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="subtitle">{i.number}</Txt>
                <Badge label={i.status_label} tone={statusTone(i.status)} />
              </View>
              <Txt variant="label" tone="muted" weight="500">{i.organization}{i.case ? ` · ${i.case}` : ''}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                <Txt variant="caption" tone="muted">Total {formatPkrExact(Number(i.total))}</Txt>
                <Txt variant="label" tone={Number(i.balance) > 0 ? 'danger' : 'success'}>Balance {formatPkrExact(Number(i.balance))}</Txt>
              </View>
              {i.due_date ? <Txt variant="caption" tone="faint">Due {new Date(i.due_date).toLocaleDateString('en-PK')}</Txt> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

export function FavouritesScreen() {
  const { spacing } = useTheme();
  const q = useQuery(() => clientApi.favourites());
  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.lawyers.length ? <EmptyState icon="heart" title="No saved lawyers" message="Tap Save on a lawyer's profile to keep them here." /> : (
        <View style={{ gap: spacing.md }}>
          {q.data.lawyers.map((l) => <FavouriteRow key={l.slug} {...l} />)}
        </View>
      )}
    </Screen>
  );
}

function FavouriteRow({ slug, name, headline, city }: { slug: string; name: string; headline: string | null; city: string | null }) {
  const nav = useAppNavigation();
  return (
    <Card onPress={() => nav.navigate('LawyerProfile', { slug })}>
      <Txt variant="subtitle">{name}</Txt>
      <Txt variant="label" tone="muted" weight="500">{[headline, city].filter(Boolean).join(' · ')}</Txt>
    </Card>
  );
}
