import { useRoute, type RouteProp } from '@react-navigation/native';

import { webPage, webPost, type Option } from '@/api';
import { DateField, ErrorState, FormScreen, Input, Loading, Picker, Screen, SwitchRow, TimeField, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';

type CaseOptions = { hearingTypes: Option[]; attendance: Option[]; courts: Option<number>[]; lawyers: Option<number>[] };

/**
 * Schedule a hearing (HearingRequest) or record what happened at one (HearingOutcomeRequest) —
 * the same web actions, so hearing reminders and client notifications go out exactly as on the web.
 */
export function HearingFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'HearingForm'>>();
  const nav = useAppNavigation();
  const outcome = !!params.hearingId;
  const q = useQuery(() => webPage<{ options: CaseOptions }>(`/workspace/cases/${params.caseId}`), [params.caseId]);
  const today = new Date().toISOString().slice(0, 10);
  const f = useForm<Record<string, any>>(outcome
    ? { held_on: today, lawyer_attendance: null, client_attendance: null, proceedings: '', order_passed: '', adjournment_reason: '', client_note: '', internal_notes: '', schedule_next: true, next_hearing_date: '', next_hearing_time: '', next_hearing_purpose: '', next_hearing_type: 'regular' }
    : { hearing_date: '', hearing_time: '', hearing_type: 'regular', purpose: '', court_id: null, courtroom: '', judge_name: '', assigned_lawyer_id: null, preparation_notes: '', visible_to_client: true });

  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const o = q.data.options;
  const v = f.values;
  const e = f.errors;
  const done = () => nav.goBack();

  if (outcome) {
    return (
      <FormScreen submitLabel="Save outcome" busy={f.busy} message={f.message} onSubmit={() => void f.submit((values) => webPost(`/workspace/hearings/${params.hearingId}/outcome`, values), done)}>
        <DateField label="Held on" required value={v.held_on} onChange={(t) => f.set('held_on', t)} error={e.held_on} quick={false} />
        <Picker label="Lawyer attendance" value={v.lawyer_attendance} options={o.attendance} onChange={(x) => f.set('lawyer_attendance', x)} error={e.lawyer_attendance} />
        <Picker label="Client attendance" value={v.client_attendance} options={o.attendance} onChange={(x) => f.set('client_attendance', x)} error={e.client_attendance} />
        <Input label="Proceedings" value={v.proceedings} onChangeText={(t) => f.set('proceedings', t)} error={e.proceedings} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
        <Input label="Order passed" value={v.order_passed} onChangeText={(t) => f.set('order_passed', t)} error={e.order_passed} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Input label="Adjournment reason" value={v.adjournment_reason} onChangeText={(t) => f.set('adjournment_reason', t)} error={e.adjournment_reason} />
        <Input label="Note for the client" value={v.client_note} onChangeText={(t) => f.set('client_note', t)} error={e.client_note} />
        <Input label="Internal notes" value={v.internal_notes} onChangeText={(t) => f.set('internal_notes', t)} error={e.internal_notes} multiline />
        <SwitchRow label="Schedule the next hearing" value={!!v.schedule_next} onChange={(x) => f.set('schedule_next', x)} />
        {v.schedule_next ? (
          <>
            <DateField label="Next hearing date" required value={v.next_hearing_date} onChange={(t) => f.set('next_hearing_date', t)} error={e.next_hearing_date} />
            <TimeField label="Time" value={v.next_hearing_time} onChange={(t) => f.set('next_hearing_time', t)} error={e.next_hearing_time} />
            <Picker label="Type" value={v.next_hearing_type} options={o.hearingTypes} onChange={(x) => f.set('next_hearing_type', x)} error={e.next_hearing_type} />
            <Input label="Purpose" value={v.next_hearing_purpose} onChangeText={(t) => f.set('next_hearing_purpose', t)} error={e.next_hearing_purpose} />
          </>
        ) : null}
      </FormScreen>
    );
  }

  return (
    <FormScreen submitLabel="Schedule hearing" busy={f.busy} message={f.message} onSubmit={() => void f.submit((values) => webPost(`/workspace/cases/${params.caseId}/hearings`, values), done)}>
      <DateField label="Hearing date" required value={v.hearing_date} onChange={(t) => f.set('hearing_date', t)} error={e.hearing_date} />
      <TimeField label="Time" value={v.hearing_time} onChange={(t) => f.set('hearing_time', t)} error={e.hearing_time} />
      <Picker label="Hearing type" required value={v.hearing_type} options={o.hearingTypes} onChange={(x) => f.set('hearing_type', x)} error={e.hearing_type} />
      <Input label="Purpose" value={v.purpose} onChangeText={(t) => f.set('purpose', t)} error={e.purpose} placeholder="e.g. Arguments on bail" />
      <Picker label="Court" value={v.court_id} options={o.courts} onChange={(x) => f.set('court_id', x)} error={e.court_id} />
      <Input label="Courtroom" value={v.courtroom} onChangeText={(t) => f.set('courtroom', t)} error={e.courtroom} />
      <Input label="Judge" value={v.judge_name} onChangeText={(t) => f.set('judge_name', t)} error={e.judge_name} />
      <Picker label="Assigned lawyer" value={v.assigned_lawyer_id} options={o.lawyers} onChange={(x) => f.set('assigned_lawyer_id', x)} error={e.assigned_lawyer_id} />
      <Input label="Preparation notes" value={v.preparation_notes} onChangeText={(t) => f.set('preparation_notes', t)} error={e.preparation_notes} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      <SwitchRow label="Visible to client" hint="The client sees this hearing and gets reminders." value={!!v.visible_to_client} onChange={(x) => f.set('visible_to_client', x)} />
    </FormScreen>
  );
}
