import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage, webPost, workspaceApi, type Hearing, type Option } from '@/api';
import { Alert, Badge, Button, Card, DateField, EmptyState, ErrorState, Input, KeyValue, Loading, ReasonSheet, Screen, SectionHeader, SegmentedControl, SkeletonCard, TimeField, Txt, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';
import { TaskRow, TaskSheet, type TaskItem } from './TasksScreen';
import { HearingRow } from './WorkspaceHomeScreen';

type Tab = 'overview' | 'hearings' | 'tasks' | 'documents';
type CaseData = {
  legalCase: Record<string, string | number | boolean | null> & { id: number; title: string; clients: { id: number; name: string; phone: string | null; is_primary: boolean }[] };
  counts: { hearings: number; documents: number; tasks: number };
  section: { hearings?: (Hearing & { has_outcome?: boolean })[]; tasks?: TaskItem[] } | null;
  can: { update: boolean; manageHearings: boolean; recordOutcome: boolean; manageTasks: boolean; viewDocuments: boolean };
  options: { members: Option<number>[]; priorities: Option[]; taskStatuses: Option[] };
};

/** The case file (GET /workspace/cases/{id}?tab=…) with the web's actions: edit, hearings, tasks, documents. */
export function WorkspaceCaseDetailScreen({ id }: { id: number }) {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const q = useQuery(async () => (await workspaceApi.case(id, tab === 'overview' || tab === 'documents' ? undefined : tab)) as unknown as CaseData, [id, tab]);
  const [moving, setMoving] = useState<Hearing | null>(null);
  const [cancelling, setCancelling] = useState<Hearing | null>(null);
  const [taskEdit, setTaskEdit] = useState<TaskItem | 'new' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const move = useForm<Record<string, any>>({ hearing_date: '', hearing_time: '', reason: '' });

  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const k = q.data.legalCase;
  const can = q.data.can;
  const v = (key: string) => (k[key] === null || k[key] === undefined || k[key] === '' ? '—' : String(k[key]));
  const act = async (fn: () => Promise<{ message: string }>) => {
    try { const { message } = await fn(); setNotice({ tone: 'success', text: message }); void q.refresh(); } catch (e) { setNotice({ tone: 'danger', text: errorMessage(e) }); }
  };
  const taskOptions = { members: q.data.options.members ?? [], priorities: q.data.options.priorities ?? [], statuses: q.data.options.taskStatuses ?? [], cases: [{ value: k.id, label: String(k.title) }] };

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" tone="accent" weight="700">{v('reference')}</Txt>
          <Txt variant="title">{v('title')}</Txt>
        </View>
        {can.update ? <Button title="Edit" icon="edit-2" size="sm" variant="secondary" onPress={() => nav.navigate('CaseForm', { id })} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Badge label={v('status_label')} tone={statusTone(String(k.status))} />
        <Badge label={v('priority_label')} tone={k.priority === 'high' || k.priority === 'urgent' ? 'danger' : 'neutral'} />
        <Badge label={v('case_type_label')} />
      </View>
      <View style={{ marginVertical: spacing.lg }}>
        <SegmentedControl<Tab> value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'hearings', label: `Hearings ${q.data.counts.hearings}` }, { value: 'tasks', label: `Tasks ${q.data.counts.tasks}` }, { value: 'documents', label: `Docs ${q.data.counts.documents}` }]} />
      </View>
      {notice ? <View style={{ marginBottom: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}

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
        </View>
      ) : tab === 'hearings' ? (
        <View style={{ gap: spacing.md }}>
          {can.manageHearings ? <Button title="Schedule hearing" icon="plus" onPress={() => nav.navigate('HearingForm', { caseId: id })} /> : null}
          {q.data.section?.hearings?.length ? q.data.section.hearings.map((h) => (
            <View key={h.id} style={{ gap: 6 }}>
              <HearingRow h={h} showDate />
              {h.status === 'scheduled' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {can.recordOutcome ? <Button title="Outcome" size="sm" style={{ flex: 1 }} onPress={() => nav.navigate('HearingForm', { caseId: id, hearingId: h.id })} /> : null}
                  {can.manageHearings ? <Button title="Reschedule" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => { move.setValues({ hearing_date: '', hearing_time: h.hearing_time ?? '', reason: '' }); setMoving(h); }} /> : null}
                  {can.manageHearings ? <Button title="Cancel" size="sm" variant="ghost" onPress={() => setCancelling(h)} /> : null}
                </View>
              ) : null}
            </View>
          )) : <EmptyState icon="calendar" title="No hearings yet" />}
          {moving ? (
            <Card style={{ gap: spacing.md }}>
              <SectionHeader title="Move hearing" actionLabel="Close" onAction={() => setMoving(null)} />
              {move.message ? <Alert tone={move.message.tone} message={move.message.text} /> : null}
              <DateField label="New date" required value={move.values.hearing_date} onChange={(t) => move.set('hearing_date', t)} error={move.errors.hearing_date} />
              <TimeField label="Time" value={move.values.hearing_time} onChange={(t) => move.set('hearing_time', t)} error={move.errors.hearing_time} />
              <Input label="Reason *" value={move.values.reason} onChangeText={(t) => move.set('reason', t)} error={move.errors.reason} />
              <Button title="Reschedule" full loading={move.busy} onPress={() => void move.submit((values) => webPost(`/workspace/hearings/${moving.id}/reschedule`, values), (r) => { setMoving(null); setNotice({ tone: 'success', text: r.message }); void q.refresh(); })} />
            </Card>
          ) : null}
        </View>
      ) : tab === 'tasks' ? (
        <View style={{ gap: spacing.sm }}>
          {can.manageTasks ? <Button title="Add task" icon="plus" onPress={() => setTaskEdit('new')} /> : null}
          {q.data.section?.tasks?.length ? q.data.section.tasks.map((t) => (
            <TaskRow key={t.id} task={t} onPress={can.manageTasks ? () => setTaskEdit(t) : undefined} onToggle={() => void act(() => webPost(`/workspace/tasks/${t.id}/status`, { status: t.status === 'done' ? 'open' : 'done' }))} />
          )) : <EmptyState icon="check-square" title="No tasks" />}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Txt tone="muted">{q.data.counts.documents} documents on this case.</Txt>
          <Button title="Open case documents" icon="folder" onPress={() => nav.navigate('Documents', { caseId: id })} />
        </View>
      )}

      <ReasonSheet visible={!!cancelling} title="Cancel this hearing?" confirmLabel="Cancel hearing" danger onClose={() => setCancelling(null)} onSubmit={async (reason) => { const h = cancelling!; setCancelling(null); await act(() => webPost(`/workspace/hearings/${h.id}/cancel`, { reason })); }} />
      <TaskSheet task={taskEdit} options={taskOptions} caseId={id} onClose={() => setTaskEdit(null)} onSaved={(m) => { setTaskEdit(null); setNotice({ tone: 'success', text: m }); void q.refresh(); }} />
    </Screen>
  );
}
