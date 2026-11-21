import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Linking, View } from 'react-native';

import { directoryApi } from '@/api';
import { Avatar, Button, Card, ErrorState, KeyValue, ListRow, Loading, Screen, SectionHeader, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export function FirmProfileScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'FirmProfile'>>();
  const nav = useAppNavigation();
  const { c, spacing, radius } = useTheme();
  const q = useQuery(() => directoryApi.firm(params.slug), [params.slug]);

  if (q.loading) {
    return <Loading label="Loading firm…" />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const { firm, lawyers } = q.data;

  return (
    <Screen edges={[]}>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
        <Avatar name={firm.name} uri={firm.logo_url} size={84} tone="neutral" />
        <Txt variant="title" center>{firm.name}</Txt>
        <Txt tone="muted">{[firm.city, `${firm.members} lawyers`, firm.founded_year && `Since ${firm.founded_year}`].filter(Boolean).join(' · ')}</Txt>
      </View>
      {firm.focus.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: spacing.lg }}>
          {firm.focus.map((f) => <View key={f} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.primarySoft }}><Txt variant="label" tone="accent">{f}</Txt></View>)}
        </View>
      ) : null}
      {firm.description ? <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}><SectionHeader title="About" /><Card><Txt style={{ lineHeight: 22 }}>{firm.description}</Txt></Card></View> : null}
      <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}>
        <SectionHeader title="Contact" />
        <Card>
          <KeyValue label="Address" value={firm.address ?? '—'} />
          <KeyValue label="Phone" value={firm.phone ?? '—'} />
          <KeyValue label="Email" value={firm.email ?? '—'} />
          <KeyValue label="Website" value={firm.website ?? '—'} last />
        </Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {firm.phone ? <Button title="Call" icon="phone" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${firm.phone}`)} /> : null}
          {firm.website ? <Button title="Website" icon="globe" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(firm.website!)} /> : null}
        </View>
      </View>
      <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}>
        <SectionHeader title={`Lawyers (${lawyers.length})`} />
        <Card padded={false}>
          {lawyers.map((l, i) => (
            <ListRow
              key={l.slug}
              title={l.name}
              subtitle={l.specializations.slice(0, 3).join(' · ') || l.headline || undefined}
              leading={<Avatar name={l.name} uri={l.photo_url} size={40} />}
              trailing={l.verified ? <Feather name="check-circle" size={16} color={c.success} /> : undefined}
              onPress={() => nav.navigate('LawyerProfile', { slug: l.slug })}
              chevron
              divider={i < lawyers.length - 1}
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}
