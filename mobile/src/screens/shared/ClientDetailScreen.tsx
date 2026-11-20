import { type RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, KeyValue, ListRow, Screen, SectionHeader, Stat, Txt } from '@/components';
import { cases, clients } from '@/data/mock';
import { formatPkr, formatPkrExact } from '@/lib/format';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientDetailScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClientDetail'>>();
  const client = clients.find((cl) => cl.id === params.id);

  if (!client) {
    return (
      <Screen>
        <EmptyState icon="user" title="Client not found" />
      </Screen>
    );
  }

  const clientCases = cases.filter((cs) => cs.clientId === client.id);

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Avatar name={client.name} size={76} tone="neutral" />
        <Txt variant="subtitle" style={{ marginTop: spacing.md }}>
          {client.name}
        </Txt>
        <Txt variant="caption" tone="muted">
          {client.city} · client since {client.since}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={clientCases.length} label="Cases" />
        <Stat value={formatPkr(client.outstanding)} label="Outstanding" deltaTone={client.outstanding > 0 ? 'danger' : 'muted'} />
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label="Phone" value={client.phone} />
        <KeyValue label="Email" value={client.email} />
        <KeyValue label="Outstanding balance" value={formatPkrExact(client.outstanding)} last />
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        <Button title="Call" variant="secondary" icon="phone" style={{ flex: 1 }} />
        <Button title="Message" variant="secondary" icon="message-circle" style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Cases" />
      {clientCases.length === 0 ? (
        <EmptyState icon="folder" title="No cases" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {clientCases.map((cs, i) => (
            <ListRow
              key={cs.id}
              title={cs.title}
              subtitle={`${cs.reference} · ${cs.court}`}
              trailing={<Badge label={label(cs.status)} tone={caseTone(cs.status)} />}
              divider={i < clientCases.length - 1}
              chevron
              onPress={() => nav.navigate('CaseDetail', { id: cs.id })}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
