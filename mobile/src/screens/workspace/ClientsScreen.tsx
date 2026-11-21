import { useState } from 'react';
import { Linking, View } from 'react-native';

import { workspaceApi } from '@/api';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, KeyValue, ListRow, Loading, Screen, SectionHeader, SkeletonCard, Txt } from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientsScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search, 350);
  const q = useQuery(() => workspaceApi.clients({ search: term }), [term]);
  const page = q.data?.clients;

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Input icon="search" placeholder="Name, phone or CNIC" value={search} onChangeText={setSearch} />
      {q.data ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {[['Total', q.data.kpis.total], ['Portal', q.data.kpis.portal], ['New this month', q.data.kpis.new_this_month]].map(([l, n]) => (
            <Card key={String(l)} style={{ flex: 1 }}><Txt variant="heading">{n ?? 0}</Txt><Txt variant="caption" tone="muted">{l}</Txt></Card>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: spacing.lg }}>
        {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !page?.data.length ? <EmptyState icon="users" title="No clients" /> : (
          <Card padded={false}>
            {page.data.map((cl, i) => (
              <ListRow key={cl.id} title={cl.name} subtitle={[cl.phone, cl.city].filter(Boolean).join(' · ') || undefined} meta={`${cl.cases_count} case${cl.cases_count === 1 ? '' : 's'}`}
                leading={<Avatar name={cl.name} uri={cl.avatar_url} size={40} tone="neutral" />} onPress={() => nav.navigate('ClientDetail', { id: cl.id })} chevron divider={i < page.data.length - 1} />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

type ClientData = {
  client: { id: number; name: string; type: string; company_name: string | null; email: string | null; phone: string | null; whatsapp: string | null; address: string | null; city: string | null; cnic: string | null; notes: string | null; user_id: number | null };
  cases: { id: number; title: string; reference?: string; status: string; status_label: string }[];
  appointments: { id: number; starts_at: string; status: string; status_label: string }[];
};

export function ClientDetailScreen({ id }: { id: number }) {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const q = useQuery(async () => (await workspaceApi.client(id)) as unknown as ClientData, [id]);
  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const { client: cl, cases, appointments } = q.data;
  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={cl.name} size={76} tone="neutral" />
        <Txt variant="title" center>{cl.name}</Txt>
        {cl.company_name ? <Txt tone="muted">{cl.company_name}</Txt> : null}
        {cl.user_id ? <Badge label="Has portal access" tone="success" /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        {cl.phone ? <Button title="Call" icon="phone" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${cl.phone}`)} /> : null}
        {cl.whatsapp || cl.phone ? <Button title="WhatsApp" icon="message-circle" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`https://wa.me/${(cl.whatsapp ?? cl.phone ?? '').replace(/\D/g, '')}`)} /> : null}
      </View>
      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label="Email" value={cl.email ?? '—'} />
        <KeyValue label="Phone" value={cl.phone ?? '—'} />
        <KeyValue label="CNIC" value={cl.cnic ?? '—'} />
        <KeyValue label="City" value={cl.city ?? '—'} />
        <KeyValue label="Address" value={cl.address ?? '—'} last />
      </Card>
      {cl.notes ? <Card style={{ marginTop: spacing.md }}><Txt tone="muted">{cl.notes}</Txt></Card> : null}
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <SectionHeader title={`Cases (${cases.length})`} />
        {cases.map((k) => (
          <Card key={k.id} onPress={() => nav.navigate('CaseDetail', { id: k.id })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="subtitle" style={{ flex: 1 }}>{k.title}</Txt><Badge label={k.status_label} tone={statusTone(k.status)} /></View>
          </Card>
        ))}
      </View>
      {appointments.length ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <SectionHeader title="Appointments" />
          <Card>{appointments.map((a, i) => <KeyValue key={a.id} label={new Date(a.starts_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} value={a.status_label} last={i === appointments.length - 1} />)}</Card>
        </View>
      ) : null}
    </Screen>
  );
}
