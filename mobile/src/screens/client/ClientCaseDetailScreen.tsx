import { View } from 'react-native';

import { clientApi } from '@/api';
import { Badge, Card, EmptyState, ErrorState, KeyValue, Loading, Screen, SectionHeader, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useTheme } from '@/theme';

/** What the lawyer shared: summary, client-visible hearings, timeline and documents. */
export function ClientCaseDetailScreen({ id }: { id: number }) {
  const { c, spacing } = useTheme();
  const q = useQuery(() => clientApi.case(id), [id]);
  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const { legalCase: k, hearings, timeline, documents } = q.data;
  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="title">{k.title}</Txt>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Badge label={k.status_label} tone={statusTone(k.status)} />
        <Badge label={k.case_type} />
      </View>
      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label="Case number" value={k.case_number ?? '—'} />
        <KeyValue label="Court" value={k.court ?? '—'} />
        <KeyValue label="Stage" value={k.stage ?? '—'} />
        <KeyValue label="Law firm" value={k.organization} />
        <KeyValue label="Lawyers" value={k.lawyers.map((l) => l.name).join(', ')} last />
      </Card>
      {k.summary ? <View style={{ marginTop: spacing.xl, gap: spacing.md }}><SectionHeader title="Summary" /><Card><Txt>{k.summary}</Txt></Card></View> : null}
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <SectionHeader title="Hearings" />
        {hearings.length === 0 ? <EmptyState icon="calendar" title="No hearings shared" /> : hearings.map((h) => (
          <Card key={h.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variant="subtitle">{new Date(h.hearing_date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{h.hearing_time ? ` · ${h.hearing_time}` : ''}</Txt>
              <Badge label={h.status_label} tone={statusTone(h.status)} />
            </View>
            {h.purpose ? <Txt tone="muted" style={{ marginTop: 4 }}>{h.purpose}</Txt> : null}
            {h.court ? <Txt variant="caption" tone="faint">{h.court}</Txt> : null}
            {h.client_note ? <Txt variant="label" tone="accent" style={{ marginTop: 6 }}>Note: {h.client_note}</Txt> : null}
            {h.order_passed ? <Txt variant="label" style={{ marginTop: 6 }}>Order: <Txt variant="label" weight="400" tone="muted">{h.order_passed}</Txt></Txt> : null}
          </Card>
        ))}
      </View>
      {timeline.length ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <SectionHeader title="Timeline" />
          <Card>
            {timeline.map((e, i) => (
              <View key={e.id} style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 }} />
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{e.title}</Txt>
                  {e.description ? <Txt variant="caption" tone="muted">{e.description}</Txt> : null}
                  <Txt variant="caption" tone="faint">{new Date(e.occurred_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
      {documents.length ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <SectionHeader title="Documents" />
          <Card>{documents.map((d, i) => <KeyValue key={d.id} label={d.title} value={d.category} last={i === documents.length - 1} />)}</Card>
        </View>
      ) : null}
    </Screen>
  );
}
