import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Card, EmptyState, Input, ListRow, Screen, Txt } from '@/components';
import { clients } from '@/data/mock';
import { formatPkr } from '@/lib/format';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientsScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const [query, setQuery] = useState('');
  const list = clients.filter((cl) => cl.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Clients
      </Txt>
      <Input icon="search" placeholder="Search clients" value={query} onChangeText={setQuery} />

      <View style={{ marginTop: spacing.lg }}>
        {list.length === 0 ? (
          <EmptyState icon="users" title="No clients found" message="Try a different name." />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            {list.map((cl, i) => (
              <ListRow
                key={cl.id}
                leading={<Avatar name={cl.name} tone="neutral" />}
                title={cl.name}
                subtitle={`${cl.city} · ${cl.cases} case${cl.cases === 1 ? '' : 's'} · client since ${cl.since}`}
                trailing={cl.outstanding > 0 ? <Badge label={`${formatPkr(cl.outstanding)} due`} tone="warning" /> : <Badge label="Clear" tone="success" />}
                divider={i < list.length - 1}
                chevron
                onPress={() => nav.navigate('ClientDetail', { id: cl.id })}
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
