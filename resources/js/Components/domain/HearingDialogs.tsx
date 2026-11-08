import { useForm } from '@inertiajs/react';
import { AlertTriangle, Camera } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Input, Modal, Select, Textarea } from '@/Components/ui';
import { todayIso } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { HearingSummary, SelectOption } from '@/types/domain';

export type HearingOptions = { hearingTypes: Option[]; attendance: Option[]; courts?: SelectOption[]; judges?: SelectOption[]; lawyers?: SelectOption[] };

/** Warns (never blocks) when the assigned lawyer already has hearings at that time. */
function useConflicts(date: string, time: string, lawyerId: string, ignore?: number) {
    const [conflicts, setConflicts] = useState<{ id: number; time: string | null; case: string; court: string | null }[]>([]);
    useEffect(() => {
        if (!date) return setConflicts([]);
        const controller = new AbortController();
        const params = new URLSearchParams({ date, ...(time ? { time } : {}), ...(lawyerId ? { lawyer_id: lawyerId } : {}), ...(ignore ? { ignore: String(ignore) } : {}) });
        fetch(`${route('hearings.conflicts')}?${params}`, { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { conflicts: [] }))
            .then((d) => setConflicts(d.conflicts ?? []))
            .catch(() => undefined);
        return () => controller.abort();
    }, [date, time, lawyerId, ignore]);
    return conflicts;
}

function ConflictWarning({ conflicts }: { conflicts: ReturnType<typeof useConflicts> }) {
    const t = useT();
    if (conflicts.length === 0) return null;
    return (
        <Alert tone="warning" title={t('Possible clash')}>
            <ul className="mt-1 list-disc ps-4">
                {conflicts.map((c) => (
                    <li key={c.id}>{c.time ?? t('Untimed')} — {c.case}{c.court ? ` (${c.court})` : ''}</li>
                ))}
            </ul>
            <p className="mt-1 text-xs">{t('You can still save — overlapping hearings are common.')}</p>
        </Alert>
    );
}

export function ScheduleHearingDialog({ open, onClose, caseId, defaults, options }: { open: boolean; onClose: () => void; caseId: number; defaults?: Partial<{ court_id: number | null; assigned_lawyer_id: number | null }>; options: HearingOptions }) {
    const t = useT();
    const form = useForm({
        hearing_date: '', hearing_time: '', hearing_type: 'regular', purpose: '', court_id: defaults?.court_id ? String(defaults.court_id) : '',
        judge_id: '', judge_name: '', courtroom: '', assigned_lawyer_id: defaults?.assigned_lawyer_id ? String(defaults.assigned_lawyer_id) : '', preparation_notes: '', visible_to_client: true,
    });
    const conflicts = useConflicts(form.data.hearing_date, form.data.hearing_time, form.data.assigned_lawyer_id);
    const judges = (options.judges ?? []).filter((j) => !form.data.court_id || String(j.court_id) === form.data.court_id);

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((d) => ({ ...d, court_id: d.court_id || null, judge_id: d.judge_id || null, assigned_lawyer_id: d.assigned_lawyer_id || null, hearing_time: d.hearing_time || null }));
        form.post(route('cases.hearings.store', caseId), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    }

    return (
        <Modal open={open} onClose={onClose} title={t('Schedule hearing')} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing}>{t('Schedule')}</Button></>}>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Date')} type="date" value={form.data.hearing_date} onChange={(e) => form.setData('hearing_date', e.target.value)} error={form.errors.hearing_date} required />
                <Input label={t('Time')} type="time" value={form.data.hearing_time} onChange={(e) => form.setData('hearing_time', e.target.value)} error={form.errors.hearing_time} />
                <Select label={t('Hearing type')} value={form.data.hearing_type} onChange={(e) => form.setData('hearing_type', e.target.value)} options={options.hearingTypes} />
                <Input label={t('Purpose')} value={form.data.purpose} onChange={(e) => form.setData('purpose', e.target.value)} placeholder={t('e.g. Arguments on bail')} />
                {options.courts && <Select label={t('Court')} value={form.data.court_id} onChange={(e) => form.setData('court_id', e.target.value)} options={options.courts} placeholder={t('Same as case')} />}
                {judges.length > 0 ? (
                    <Select label={t('Judge')} value={form.data.judge_id} onChange={(e) => form.setData('judge_id', e.target.value)} options={judges} placeholder={t('Select judge')} />
                ) : (
                    <Input label={t('Judge')} value={form.data.judge_name} onChange={(e) => form.setData('judge_name', e.target.value)} />
                )}
                <Input label={t('Courtroom')} value={form.data.courtroom} onChange={(e) => form.setData('courtroom', e.target.value)} />
                {options.lawyers && <Select label={t('Appearing lawyer')} value={form.data.assigned_lawyer_id} onChange={(e) => form.setData('assigned_lawyer_id', e.target.value)} options={options.lawyers} placeholder={t('Me')} error={form.errors.assigned_lawyer_id} />}
                <Textarea wrapperClassName="sm:col-span-2" label={t('Preparation notes')} rows={3} value={form.data.preparation_notes} onChange={(e) => form.setData('preparation_notes', e.target.value)} />
                <div className="sm:col-span-2"><Checkbox label={t('Show this hearing to the client')} checked={form.data.visible_to_client} onChange={(e) => form.setData('visible_to_client', e.target.checked)} /></div>
                <div className="sm:col-span-2"><ConflictWarning conflicts={conflicts} /></div>
            </form>
        </Modal>
    );
}

export function RescheduleDialog({ hearing, onClose }: { hearing: HearingSummary | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ hearing_date: '', hearing_time: hearing?.hearing_time ?? '', reason: '' });
    const conflicts = useConflicts(form.data.hearing_date, form.data.hearing_time, hearing?.assigned_lawyer_id ? String(hearing.assigned_lawyer_id) : '', hearing?.id);
    useEffect(() => form.setData({ hearing_date: '', hearing_time: hearing?.hearing_time ?? '', reason: '' }), [hearing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    function submit() {
        if (!hearing) return;
        form.transform((d) => ({ ...d, hearing_time: d.hearing_time || null }));
        form.post(route('hearings.reschedule', hearing.id), { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <Modal open={!!hearing} onClose={onClose} title={t('Reschedule hearing')} description={t('The original date stays in the case history.')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing}>{t('Reschedule')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('New date')} type="date" value={form.data.hearing_date} onChange={(e) => form.setData('hearing_date', e.target.value)} error={form.errors.hearing_date} required />
                <Input label={t('Time')} type="time" value={form.data.hearing_time} onChange={(e) => form.setData('hearing_time', e.target.value)} />
                <Input wrapperClassName="sm:col-span-2" label={t('Reason')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required placeholder={t('e.g. Presiding officer on leave')} />
                <div className="sm:col-span-2"><ConflictWarning conflicts={conflicts} /></div>
            </div>
        </Modal>
    );
}

/**
 * Post-hearing record. Mobile-friendly: quick fields first (attendance, order,
 * next date), detailed proceedings collapsed under "More details".
 */
export function OutcomeDialog({ hearing, onClose, options, canUpload }: { hearing: HearingSummary | null; onClose: () => void; options: HearingOptions; canUpload?: boolean }) {
    const t = useT();
    const [details, setDetails] = useState(false);
    const blank = {
        held_on: todayIso(), lawyer_attendance: 'present', client_attendance: '', opposing_counsel_attendance: '', proceedings: '', arguments: '', evidence: '',
        documents_submitted: '', order_passed: '', adjournment_reason: '', internal_notes: '', client_note: '', schedule_next: true, next_hearing_date: '',
        next_hearing_time: '', next_hearing_purpose: '', next_hearing_type: '', order_photo: null as File | null,
    };
    const form = useForm(blank);

    useEffect(() => {
        if (hearing) form.setData({ ...blank, held_on: hearing.hearing_date > todayIso() ? todayIso() : hearing.hearing_date, next_hearing_time: hearing.hearing_time ?? '' });
    }, [hearing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    function submit() {
        if (!hearing) return;
        form.transform((d) => {
            const payload: Record<string, unknown> = { ...d, schedule_next: d.schedule_next && !!d.next_hearing_date };
            Object.keys(payload).forEach((k) => payload[k] === '' && (payload[k] = null));
            if (!d.order_photo) delete payload.order_photo;
            return payload;
        });
        form.post(route('hearings.outcome', hearing.id), { preserveScroll: true, forceFormData: !!form.data.order_photo, onSuccess: onClose });
    }

    const attendance = [{ value: '', label: '—' }, ...options.attendance];

    return (
        <Modal open={!!hearing} onClose={onClose} title={t('Record proceedings')} description={hearing?.case?.title} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                {hearing?.has_outcome && <Alert tone="info">{t('Proceedings were already recorded. Saving creates an audited correction.')}</Alert>}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Input label={t('Held on')} type="date" value={form.data.held_on} max={todayIso()} onChange={(e) => form.setData('held_on', e.target.value)} error={form.errors.held_on} />
                    <Select label={t('Our lawyer')} value={form.data.lawyer_attendance} onChange={(e) => form.setData('lawyer_attendance', e.target.value)} options={attendance} />
                    <Select label={t('Client')} value={form.data.client_attendance} onChange={(e) => form.setData('client_attendance', e.target.value)} options={attendance} />
                </div>
                <Textarea label={t('Order passed')} rows={2} value={form.data.order_passed} onChange={(e) => form.setData('order_passed', e.target.value)} error={form.errors.order_passed} />
                <Input label={t('Adjournment reason (if adjourned)')} value={form.data.adjournment_reason} onChange={(e) => form.setData('adjournment_reason', e.target.value)} />

                <div className="rounded-lg border border-navy-100 p-3 dark:border-navy-800">
                    <Checkbox label={<span className="font-medium">{t('Schedule the next hearing')}</span>} checked={form.data.schedule_next} onChange={(e) => form.setData('schedule_next', e.target.checked)} />
                    {form.data.schedule_next && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Input label={t('Next date')} type="date" min={form.data.held_on} value={form.data.next_hearing_date} onChange={(e) => form.setData('next_hearing_date', e.target.value)} error={form.errors.next_hearing_date} />
                            <Input label={t('Time')} type="time" value={form.data.next_hearing_time} onChange={(e) => form.setData('next_hearing_time', e.target.value)} />
                            <Input label={t('Purpose')} value={form.data.next_hearing_purpose} onChange={(e) => form.setData('next_hearing_purpose', e.target.value)} />
                        </div>
                    )}
                </div>

                <Textarea label={t('Note for the client')} hint={t('Shown in the client portal if this hearing is visible to them.')} rows={2} value={form.data.client_note} onChange={(e) => form.setData('client_note', e.target.value)} />

                {canUpload && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-navy-300 p-3 text-sm dark:border-navy-700">
                        <Camera className="size-5 text-navy-500" />
                        <span className="flex-1">{form.data.order_photo ? form.data.order_photo.name : t('Photograph or upload the court order')}</span>
                        <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => form.setData('order_photo', e.target.files?.[0] ?? null)} />
                    </label>
                )}
                {form.errors.order_photo && <p className="text-xs text-red-600">{form.errors.order_photo}</p>}

                <button type="button" onClick={() => setDetails(!details)} className="text-sm font-medium text-navy-700 underline-offset-2 hover:underline dark:text-gold-300">
                    {details ? t('Hide details') : t('More details (proceedings, arguments, evidence)')}
                </button>
                {details && (
                    <div className="grid gap-4">
                        <Select label={t('Opposing counsel')} value={form.data.opposing_counsel_attendance} onChange={(e) => form.setData('opposing_counsel_attendance', e.target.value)} options={attendance} />
                        <Textarea label={t('Proceedings')} value={form.data.proceedings} onChange={(e) => form.setData('proceedings', e.target.value)} />
                        <Textarea label={t('Arguments')} value={form.data.arguments} onChange={(e) => form.setData('arguments', e.target.value)} />
                        <Textarea label={t('Evidence')} value={form.data.evidence} onChange={(e) => form.setData('evidence', e.target.value)} />
                        <Textarea label={t('Documents submitted')} rows={2} value={form.data.documents_submitted} onChange={(e) => form.setData('documents_submitted', e.target.value)} />
                        <Textarea label={t('Internal notes')} hint={t('Encrypted. Never shown to clients.')} value={form.data.internal_notes} onChange={(e) => form.setData('internal_notes', e.target.value)} />
                    </div>
                )}
                {Object.keys(form.errors).length > 0 && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle className="size-4" />{t('Please check the highlighted fields.')}</p>}
            </div>
        </Modal>
    );
}

export function CancelHearingDialog({ hearing, onClose }: { hearing: HearingSummary | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ reason: '' });
    return (
        <Modal open={!!hearing} onClose={onClose} title={t('Cancel hearing')} size="sm" footer={<><Button variant="secondary" onClick={onClose}>{t('Back')}</Button><Button variant="danger" loading={form.processing} onClick={() => hearing && form.post(route('hearings.cancel', hearing.id), { preserveScroll: true, onSuccess: onClose })}>{t('Cancel hearing')}</Button></>}>
            <Input label={t('Reason')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required />
        </Modal>
    );
}
