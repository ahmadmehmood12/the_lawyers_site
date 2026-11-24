import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect } from 'react';

import { webPage, webPost, webPut, type Option } from '@/api';
import { DateField, ErrorState, FormScreen, Input, Loading, Picker, Screen, SwitchRow, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';

type CaseOptions = { types: Option[]; statuses: Option[]; priorities: Option[]; courts: Option<number>[]; specializations: Option<number>[]; clients: Option<number>[] };
type CasePage = { legalCase: Record<string, any> | null; options: CaseOptions };

/** New / edit case — the web's case form (CaseRequest): same fields, rules and messages. */
export function CaseFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'CaseForm'>>();
  const nav = useAppNavigation();
  const id = params?.id;
  const q = useQuery(() => webPage<CasePage>(id ? `/workspace/cases/${id}/edit` : '/workspace/cases/create'), [id]);
  const f = useForm<Record<string, any>>({ title: '', case_type: 'civil', status: 'filed', priority: 'normal', client_ids: params?.clientId ? [params.clientId] : [], court_id: null, specialization_id: null, case_number: '', filing_date: '', stage: '', description: '', fir_number: '', police_station: '', legal_sections: '', client_summary: '', share_with_client: false });

  useEffect(() => {
    const c = q.data?.legalCase;
    if (c) {
      f.setValues((v) => ({ ...v, ...Object.fromEntries(Object.entries(c).filter(([k]) => k in v)), client_ids: (c.client_ids ?? c.clients?.map((x: { id: number }) => x.id) ?? v.client_ids) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const o = q.data.options;
  const v = f.values;
  const e = f.errors;
  const criminal = v.case_type === 'criminal';

  return (
    <FormScreen submitLabel={id ? 'Save case' : 'Create case'} busy={f.busy} message={f.message} onSubmit={() => void f.submit(
      (values) => (id ? webPut(`/workspace/cases/${id}`, values) : webPost('/workspace/cases', values)),
      (r) => { const caseId = Number(r.params?.case ?? id); nav.goBack(); if (!id && caseId) { nav.navigate('CaseDetail', { id: caseId }); } },
    )}>
      <Input label="Case title *" value={v.title} onChangeText={(t) => f.set('title', t)} error={e.title} placeholder="e.g. Muhammad Ali v. The State" />
      {!id ? <Picker label="Clients" required multiple value={v.client_ids} options={o.clients} onChange={(x) => f.set('client_ids', x)} error={e.client_ids} /> : null}
      <Picker label="Case type" required value={v.case_type} options={o.types} onChange={(x) => f.set('case_type', x)} error={e.case_type} />
      <Picker label="Status" required value={v.status} options={o.statuses} onChange={(x) => f.set('status', x)} error={e.status} />
      <Picker label="Priority" required value={v.priority} options={o.priorities} onChange={(x) => f.set('priority', x)} error={e.priority} />
      <Picker label="Court" value={v.court_id} options={o.courts} onChange={(x) => f.set('court_id', x)} error={e.court_id} />
      <Picker label="Practice area" value={v.specialization_id} options={o.specializations} onChange={(x) => f.set('specialization_id', x)} error={e.specialization_id} />
      <Input label="Case number" value={v.case_number ?? ''} onChangeText={(t) => f.set('case_number', t)} error={e.case_number} placeholder="e.g. 1234/2026" />
      <DateField label="Filing date" value={v.filing_date} onChange={(t) => f.set('filing_date', t)} error={e.filing_date} quick={false} />
      <Input label="Stage" value={v.stage ?? ''} onChangeText={(t) => f.set('stage', t)} error={e.stage} placeholder="e.g. Evidence" />
      {criminal ? (
        <>
          <Input label="FIR number" value={v.fir_number ?? ''} onChangeText={(t) => f.set('fir_number', t)} error={e.fir_number} />
          <Input label="Police station" value={v.police_station ?? ''} onChangeText={(t) => f.set('police_station', t)} error={e.police_station} />
          <Input label="Sections" value={v.legal_sections ?? ''} onChangeText={(t) => f.set('legal_sections', t)} error={e.legal_sections} placeholder="e.g. 302, 34 PPC" />
        </>
      ) : null}
      <Input label="Description" value={v.description ?? ''} onChangeText={(t) => f.set('description', t)} error={e.description} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <Input label="Summary for the client" value={v.client_summary ?? ''} onChangeText={(t) => f.set('client_summary', t)} error={e.client_summary} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      <SwitchRow label="Share with client" hint="The client sees this case, shared hearings and documents in their portal." value={!!v.share_with_client} onChange={(x) => f.set('share_with_client', x)} />
    </FormScreen>
  );
}
