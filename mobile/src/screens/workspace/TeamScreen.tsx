import { Linking } from 'react-native';

import { workspaceApi } from '@/api';
import { Avatar, Badge, Card, EmptyState, ErrorState, ListRow, Screen, SkeletonCard, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useTheme } from '@/theme';

/** Firm members and their roles (permissions are managed on the website). */
export function TeamScreen() {
  const { spacing } = useTheme();
  const q = useQuery(() => workspaceApi.team());
  const members = q.data?.members ?? [];
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>Team</Txt>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !members.length ? <EmptyState icon="users" title="No team members" /> : (
        <Card padded={false}>
          {members.map((m, i) => (
            <ListRow key={m.id} title={m.name} subtitle={m.role_label + (m.is_owner ? ' · Owner' : '')} meta={m.email}
              leading={<Avatar name={m.name} uri={m.avatar_url} size={42} />}
              trailing={<Badge label={m.status_label} tone={m.status === 'active' ? 'success' : 'neutral'} />}
              onPress={m.phone ? () => void Linking.openURL(`tel:${m.phone}`) : undefined}
              divider={i < members.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
