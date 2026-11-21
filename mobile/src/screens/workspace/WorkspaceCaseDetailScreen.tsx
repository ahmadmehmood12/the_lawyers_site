import { useState } from 'react';
import { View } from 'react-native';

import { workspaceApi, type Hearing } from '@/api';
import { Badge, Card, EmptyState, ErrorState, KeyValue, Loading, Screen, SegmentedControl, SectionHeader, SkeletonCard, Txt } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useTheme } from '@/theme';
import { HearingRow } from './WorkspaceHomeScreen';

type Tab = 'overview' | 'hearings' | 'tasks';
type CaseData = {
  legalCase: Record<string, string | number | boolean | null> & { clients: { id: number; name: string; phone: string | null; is_primary: boolean }[] };
  counts: { hearings: number; documents: number; tasks: number };
  section: { hearings?: Hearing[]; tasks?: { id: number; title: string; status_label: string; due_date: string | null; assignee: string | null }[] } | null;
};

/** The case file (GET /workspace/cases/{id}?tab=…), same sections as the web case page. */
export function WorkspaceCaseDetailScreen({ id }: { id: number }) {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const q = useQuery(async () => (await workspaceApi.case(id, tab === 'overview' ? undefined : tab)) as unknown as CaseData, [id, tab]);

  if (q.loading && !q.data) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const k = q.data.legalCase;
  const v = (key: string) => (k[key] === null || k[key] === undefined || k[key] === '' ? '—' : String(k[key]));

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Txt variant="caption" tone="accent" weight="700">{v('reference')}</Txt>
      <Txt variant="title">{v('title')}</Txt>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Badge label={v('status_label')} tone={statusTone(String(k.status))} />
        <Badge label={v('priority_label')} tone={k.priority === 'high' || k.priority === 'urgent' ? 'danger' : 'neutral'} />
        <Badge label={v('case_type_label')} />
      </View>
      <View style={{ marginVertical: spacing.lg }}>
        <SegmentedControl<Tab> value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'hearings', label: `Hearings (${q.data.counts.hearings})` }, { value: 'tasks', label: `Tasks (${q.data.counts.tasks})` }]} />
      </View>
      {q.loading ? <SkeletonCard /> : tab === 'overview' ? (
        <View style={{ gap: spacing.lg }}>
          <Card>
            <KeyValue label="Case number" value={v('case_number')} />
            <KeyValue label="Court" value={v('court')} />
            <KeyValue label="Judge" value={v('judge')} />
            <KeyValue label="Courtroom" value={v('courtroom')} />
            <KeyValue label="Stage" value={v('stage')} />
            <KeyValue label="Practice area" value={v('specialization')} />
            <KeyValue label="Filing date" value={v('filing_date')} last={!k.is_criminal} />
            {k.is_criminal ? (
              <>
                <KeyValue label="FIR" value={`${v('fir_number')}${k.fir_date ? ` (${v('fir_date')})` : ''}`} />
                <KeyValue label="Police station" value={v('police_station')} />
                <KeyValue label="Sections" value={v('legal_sections')} />
                <KeyValue label="Bail" value={v('bail_status')} last />
              </>
            ) : null}
          </Card>
          <SectionHeader title="Clients" />
          <Card>{k.clients.length ? k.clients.map((cl, i) => <KeyValue key={cl.id} label={`${cl.name}${cl.is_primary ? ' (primary)' : ''}`} value={cl.phone ?? '—'} last={i === k.clients.length - 1} />) : <Txt tone="muted">No client linked</Txt>}</Card>
          {k.description ? <><SectionHeader title="Description" /><Card><Txt>{v('description')}</Txt></Card></> : null}
          {k.professional_fee ? <Card><KeyValue label="Professional fee" value={`Rs ${v('professional_fee')} (${v('fee_type')})`} last /></Card> : null}
        </View>
      ) : tab === 'hearings' ? (
        <View style={{ gap: spacing.md }}>
          {q.data.section?.hearings?.length ? q.data.section.hearings.map((h) => <HearingRow key={h.id} h={h} showDate />) : <EmptyState icon="calendar" title="No hearings yet" />}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {q.data.section?.tasks?.length ? q.data.section.tasks.map((t) => (
            <Card key={t.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="subtitle" style={{ flex: 1 }}>{t.title}</Txt><Badge label={t.status_label} /></View>
              <Txt variant="caption" tone="muted">{[t.assignee, t.due_date && `Due ${t.due_date}`].filter(Boolean).join(' · ')}</Txt>
            </Card>
          )) : <EmptyState icon="check-square" title="No tasks" />}
        </View>
      )}
    </Screen>
  );
}
