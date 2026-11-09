import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Alert, Button, Checkbox, Input, Modal, Select, Textarea } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { CalendarItem, EventForm } from './types';

export type FormOptions = { eventTypes: Option[]; recurrence: Option[]; visibility: Option[]; cases: { value: number; label: string }[]; clients: { value: number; label: string }[]; members: Option[] };

const blank = (date: string, time?: string): EventForm => ({
    type: 'meeting', title: '', description: '', location: '',
    starts_at: `${date}T${time ?? '10:00'}`, ends_at: `${date}T${time ? (Number(time.slice(0, 2)) >= 23 ? '23:59' : String(Number(time.slice(0, 2)) + 1).padStart(2, '0') + time.slice(2)) : '11:00'}`,
    all_day: false, visibility: 'private', legal_case_id: null, client_id: null, assigned_to: null,
    recurrence: 'none', recurrence_interval: 1, recurrence_until: null,
});

/** Create or edit a calendar event. Editing never changes the time: that goes through Reschedule so history is kept. */
export function EventFormDialog({ open, item, defaults, options, canLink, onClose, onSaved }: { open: boolean; item: CalendarItem | null; defaults: { date: string; time?: string }; options: FormOptions; canLink: boolean; onClose: () => void; onSaved: () => void }) {
    const t = useT();
    const editing = item?.editable ?? null;
    const form = useForm<EventForm>(editing ?? blank(defaults.date, defaults.time));

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData(editing ?? blank(defaults.date, defaults.time));
        }
    }, [open, item?.key, defaults.date, defaults.time]); // eslint-disable-line react-hooks/exhaustive-deps

    function submit() {
        form.transform((d) => ({
            ...d,
            ends_at: d.all_day ? null : d.ends_at || null,
            legal_case_id: d.legal_case_id || null,
            client_id: d.client_id || null,
            assigned_to: d.assigned_to || null,
            recurrence_until: d.recurrence === 'none' ? null : d.recurrence_until,
        }));
        const done = { preserveScroll: true, onSuccess: () => { onSaved(); onClose(); } };
        if (item) form.put(route('calendar.update', item.id), done);
        else form.post(route('calendar.store'), done);
    }

    const opt = (list: { value: number | string; label: string }[]) => list.map((o) => ({ value: String(o.value), label: o.label }));

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={item ? t('Edit event') : t('New event')}
            size="lg"
            footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{item ? t('Save changes') : t('Add to calendar')}</Button></>}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input wrapperClassName="sm:col-span-2" label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required autoFocus />
                <Select label={t('Type')} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} options={options.eventTypes} error={form.errors.type} />
                <Input label={t('Location')} value={form.data.location ?? ''} onChange={(e) => form.setData('location', e.target.value)} error={form.errors.location} placeholder={t('Court, chamber or online link')} />
                {item ? (
                    <Alert tone="info" className="sm:col-span-2">{t('To change the date or time, use Reschedule so the original stays in the history.')}</Alert>
                ) : (
                    <>
                        <div className="flex items-end sm:col-span-2"><Checkbox label={t('All day')} checked={form.data.all_day} onChange={(e) => form.setData('all_day', e.target.checked)} /></div>
                        <Input label={form.data.all_day ? t('Date') : t('Starts')} type={form.data.all_day ? 'date' : 'datetime-local'} value={form.data.all_day ? form.data.starts_at.slice(0, 10) : form.data.starts_at} onChange={(e) => form.setData('starts_at', form.data.all_day ? `${e.target.value}T00:00` : e.target.value)} error={form.errors.starts_at} required />
                        {!form.data.all_day && <Input label={t('Ends')} type="datetime-local" value={form.data.ends_at ?? ''} onChange={(e) => form.setData('ends_at', e.target.value)} error={form.errors.ends_at} />}
                        <Select label={t('Repeats')} value={form.data.recurrence} onChange={(e) => form.setData('recurrence', e.target.value)} options={options.recurrence} error={form.errors.recurrence} />
                        {form.data.recurrence !== 'none' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input label={t('Every')} type="number" min={1} max={12} value={String(form.data.recurrence_interval)} onChange={(e) => form.setData('recurrence_interval', Number(e.target.value) || 1)} error={form.errors.recurrence_interval} />
                                <Input label={t('Until')} type="date" value={form.data.recurrence_until ?? ''} onChange={(e) => form.setData('recurrence_until', e.target.value)} error={form.errors.recurrence_until} required />
                            </div>
                        )}
                    </>
                )}
                {canLink && (
                    <>
                        <Select label={t('Who can see it')} value={form.data.visibility} onChange={(e) => form.setData('visibility', e.target.value)} options={options.visibility} error={form.errors.visibility} />
                        <Select label={t('Case')} value={form.data.legal_case_id ? String(form.data.legal_case_id) : ''} onChange={(e) => form.setData('legal_case_id', e.target.value ? Number(e.target.value) : null)} options={opt(options.cases)} placeholder={t('No case')} error={form.errors.legal_case_id} />
                        {options.clients.length > 0 && <Select label={t('Client')} value={form.data.client_id ? String(form.data.client_id) : ''} onChange={(e) => form.setData('client_id', e.target.value ? Number(e.target.value) : null)} options={opt(options.clients)} placeholder={t('No client')} error={form.errors.client_id} hint={form.data.visibility === 'client' ? t('This client will see the event in their portal.') : undefined} />}
                        {options.members.length > 1 && <Select label={t('Assigned to')} value={form.data.assigned_to ? String(form.data.assigned_to) : ''} onChange={(e) => form.setData('assigned_to', e.target.value ? Number(e.target.value) : null)} options={options.members} placeholder={t('Me')} error={form.errors.assigned_to} />}
                    </>
                )}
                <Textarea wrapperClassName="sm:col-span-2" label={t('Notes')} rows={3} value={form.data.description ?? ''} onChange={(e) => form.setData('description', e.target.value)} error={form.errors.description} />
            </div>
        </Modal>
    );
}

/** Moves an event; the old time is logged and shown struck through. */
export function RescheduleEventDialog({ item, onClose, onSaved }: { item: CalendarItem | null; onClose: () => void; onSaved: () => void }) {
    const t = useT();
    const form = useForm({ starts_at: '', ends_at: '', reason: '' });
    useEffect(() => {
        if (item) form.setData({ starts_at: item.editable?.starts_at ?? item.start, ends_at: item.editable?.ends_at ?? '', reason: '' });
    }, [item?.key]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!item) return null;
    const allDay = item.all_day;

    return (
        <Modal
            open
            onClose={onClose}
            title={t('Reschedule event')}
            description={item.recurrence !== 'none' ? t('This moves the whole series. The original time stays in the history.') : t('The original time stays in the history and is shown struck through.')}
            footer={<><Button variant="secondary" onClick={onClose}>{t('Back')}</Button><Button loading={form.processing} onClick={() => { form.transform((d) => ({ ...d, ends_at: allDay ? null : d.ends_at || null })); form.post(route('calendar.reschedule', item.id), { preserveScroll: true, onSuccess: () => { onSaved(); onClose(); } }); }}>{t('Reschedule')}</Button></>}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={allDay ? t('New date') : t('New start')} type={allDay ? 'date' : 'datetime-local'} value={allDay ? form.data.starts_at.slice(0, 10) : form.data.starts_at} onChange={(e) => form.setData('starts_at', allDay ? `${e.target.value}T00:00` : e.target.value)} error={form.errors.starts_at} required />
                {!allDay && <Input label={t('New end')} type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} error={form.errors.ends_at} />}
                <Input wrapperClassName="sm:col-span-2" label={t('Reason (optional)')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} />
                {(form.errors as Record<string, string>).status && <Alert tone="danger" className="sm:col-span-2">{(form.errors as Record<string, string>).status}</Alert>}
            </div>
        </Modal>
    );
}

export function CancelEventDialog({ item, onClose, onSaved }: { item: CalendarItem | null; onClose: () => void; onSaved: () => void }) {
    const t = useT();
    const form = useForm({ reason: '' });
    if (!item) return null;
    return (
        <Modal
            open
            onClose={onClose}
            title={t('Cancel event')}
            description={t('The event stays on the calendar, marked as cancelled.')}
            size="sm"
            footer={<><Button variant="secondary" onClick={onClose}>{t('Back')}</Button><Button variant="danger" loading={form.processing} onClick={() => form.post(route('calendar.cancel', item.id), { preserveScroll: true, onSuccess: () => { onSaved(); onClose(); } })}>{t('Cancel event')}</Button></>}
        >
            <Input label={t('Reason')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required />
        </Modal>
    );
}
