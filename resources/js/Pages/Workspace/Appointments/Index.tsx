import { router, useForm } from '@inertiajs/react';
import { CalendarClock, Check, MapPin, Phone, Plus, Trash2, UserRound, Video, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, DateTimePicker, EmptyState, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Tabs, Textarea } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import { cn } from '@/lib/cn';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Appointment = { id: number; starts_at: string; status: string; status_label: string; mode: string; mode_label: string; contact_name: string; contact_phone: string | null; lawyer: string; client_message: string | null; meeting_link: string | null; fee: string | null; cancellation_reason: string | null };
type Slot = { weekday: number; starts_at: string; ends_at: string; mode: string };

export default function AppointmentsIndex({ appointments, filters, availability, holidays, options, canManageAll }: { appointments: Paginated<Appointment>; filters: Record<string, string>; availability: Slot[]; holidays: { id: number; date: string; reason: string | null }[]; options: { modes: Option[]; clients: SelectOption[]; lawyers: SelectOption[] }; canManageAll: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    const [create, setCreate] = useState(false);
    const [action, setAction] = useState<{ a: Appointment; status: string } | null>(null);
    const [move, setMove] = useState<Appointment | null>(null);

    return (
        <AppLayout title={t('Appointments')} wide>
            <PageHeader title={t('Appointments & consultations')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>{t('New appointment')}</Button>} />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Tabs className="mb-3" active={filters.scope ?? 'upcoming'} onChange={(k) => router.get(route('appointments.index'), { scope: k }, { preserveState: true })} tabs={[{ key: 'upcoming', label: t('Upcoming') }, { key: 'requests', label: t('Requests') }, { key: 'past', label: t('Past') }]} />
                    <Card>
                        {appointments.data.length === 0 ? <EmptyState icon={<CalendarClock className="size-5" />} title={t('No appointments')} /> : (
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {appointments.data.map((a) => <AppointmentRow key={a.id} a={a} canManageAll={canManageAll} onAction={(status) => setAction({ a, status })} onMove={() => setMove(a)} />)}
                            </ul>
                        )}
                        <Pagination meta={appointments} />
                    </Card>
                </div>
                <div className="space-y-6">
                    <WorkingHours availability={availability} />
                    <Holidays holidays={holidays} />
                </div>
            </div>
            <CreateDialog open={create} onClose={() => setCreate(false)} options={options} canManageAll={canManageAll} />
            <TransitionDialog action={action} onClose={() => setAction(null)} />
            <MoveDialog appointment={move} onClose={() => setMove(null)} />
        </AppLayout>
    );
}

function WorkingHours({ availability }: { availability: Slot[] }) {
    const t = useT();
    const days = [t('Sunday'), t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t('Saturday')];
    const form = useForm({ slots: availability.map((s) => ({ ...s, starts_at: s.starts_at.slice(0, 5), ends_at: s.ends_at.slice(0, 5) })) });
    const update = (i: number, patch: Partial<Slot>) => form.setData('slots', form.data.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    const errorFor = (i: number) => Object.entries(form.errors).find(([k]) => k.startsWith(`slots.${i}.`))?.[1];
    return (
        <Card>
            <CardHeader title={t('Consultation hours')} description={t('Clients can request slots within these hours.')} />
            <CardBody className="space-y-3">
                {form.data.slots.length === 0 && <p className="rounded-lg border border-dashed border-navy-200 p-4 text-center text-sm text-navy-500 dark:border-navy-700">{t('No hours yet. Add the days you see clients.')}</p>}
                {form.data.slots.length > 0 && (
                    <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-navy-400 sm:grid">
                        <span>{t('Day')}</span><span>{t('From')}</span><span>{t('To')}</span><span />
                    </div>
                )}
                {form.data.slots.map((s, i) => (
                    <div key={i} className="rounded-lg bg-navy-50/60 p-2 dark:bg-navy-800/40">
                        <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2rem]">
                            <select value={s.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) })} className={cn(controlClasses(false), 'col-span-2 sm:col-span-1')} aria-label={t('Day')}>{days.map((d, n) => <option key={n} value={n}>{d}</option>)}</select>
                            <DateTimePicker type="time" required value={s.starts_at} onChange={(e) => update(i, { starts_at: e.target.value })} aria-label={t('From')} step={900} />
                            <DateTimePicker type="time" required value={s.ends_at} onChange={(e) => update(i, { ends_at: e.target.value })} aria-label={t('To')} step={900} />
                            <button type="button" onClick={() => form.setData('slots', form.data.slots.filter((_, j) => j !== i))} aria-label={t('Remove')} className="col-span-2 grid h-10 place-items-center rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 sm:col-span-1 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                        </div>
                        {errorFor(i) && <p className="mt-1 px-1 text-xs text-red-600">{errorFor(i)}</p>}
                    </div>
                ))}
                {!Object.keys(form.errors).some((k) => k.startsWith('slots.')) && Object.values(form.errors)[0] && <p className="text-xs text-red-600">{Object.values(form.errors)[0]}</p>}
                <div className="flex items-center justify-between gap-2 border-t border-navy-100 pt-3 dark:border-navy-800">
                    <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => form.setData('slots', [...form.data.slots, { weekday: 1, starts_at: '17:00', ends_at: '19:00', mode: 'both' }])}>{t('Add hours')}</Button>
                    <Button size="sm" loading={form.processing} disabled={!form.isDirty} onClick={() => form.put(route('availability.update'), { preserveScroll: true })}>{t('Save hours')}</Button>
                </div>
            </CardBody>
        </Card>
    );
}

function Holidays({ holidays }: { holidays: { id: number; date: string; reason: string | null }[] }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ date: '', reason: '' });
    return (
        <Card>
            <CardHeader title={t('Unavailable days')} />
            <CardBody className="space-y-3">
                <form onSubmit={(e) => { e.preventDefault(); form.post(route('availability.holidays.store'), { preserveScroll: true, onSuccess: () => form.reset() }); }} className="flex items-end gap-2">
                    <Input label={t('Date')} type="date" value={form.data.date} onChange={(e) => form.setData('date', e.target.value)} error={form.errors.date} wrapperClassName="flex-1" />
                    <Button type="submit" size="sm" loading={form.processing} disabled={!form.data.date}>{t('Add')}</Button>
                </form>
                <ul className="space-y-1 text-sm">
                    {holidays.map((h) => (
                        <li key={h.id} className="flex items-center justify-between"><span>{formatDate(h.date, locale)}{h.reason ? `, ${h.reason}` : ''}</span><button type="button" onClick={() => router.delete(route('availability.holidays.destroy', h.id), { preserveScroll: true })} className="text-navy-400 hover:text-red-600" aria-label={t('Remove')}><Trash2 className="size-4" /></button></li>
                    ))}
                </ul>
            </CardBody>
        </Card>
    );
}

function CreateDialog({ open, onClose, options, canManageAll }: { open: boolean; onClose: () => void; options: { modes: Option[]; clients: SelectOption[]; lawyers: SelectOption[] }; canManageAll: boolean }) {
    const t = useT();
    const form = useForm({ client_id: '', contact_name: '', contact_phone: '', lawyer_id: '', starts_at: '', duration: '30', mode: 'in_person', fee: '', meeting_link: '', lawyer_notes: '' });
    function submit() {
        form.transform((d) => ({ ...d, client_id: d.client_id || null, lawyer_id: d.lawyer_id || null, fee: d.fee || null, meeting_link: d.meeting_link || null }));
        form.post(route('appointments.store'), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    }
    return (
        <Modal open={open} onClose={onClose} title={t('New appointment')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Select wrapperClassName="sm:col-span-2" label={t('Client')} value={form.data.client_id} onChange={(e) => form.setData('client_id', e.target.value)} options={options.clients} placeholder={t('Someone new')} />
                {!form.data.client_id && <><Input label={t('Name')} value={form.data.contact_name} onChange={(e) => form.setData('contact_name', e.target.value)} error={form.errors.contact_name} /><Input label={t('Phone')} type="tel" value={form.data.contact_phone} onChange={(e) => form.setData('contact_phone', e.target.value)} /></>}
                {canManageAll && <Select wrapperClassName="sm:col-span-2" label={t('Lawyer')} value={form.data.lawyer_id} onChange={(e) => form.setData('lawyer_id', e.target.value)} options={options.lawyers} placeholder={t('Me')} />}
                <Input label={t('Date & time')} type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} error={form.errors.starts_at} />
                <Select label={t('Duration')} value={form.data.duration} onChange={(e) => form.setData('duration', e.target.value)} options={['15', '30', '45', '60', '90', '120'].map((m) => ({ value: m, label: t(':count minutes', { count: m }) }))} />
                <Select label={t('Mode')} value={form.data.mode} onChange={(e) => form.setData('mode', e.target.value)} options={options.modes} />
                <Input label={t('Fee (PKR)')} type="number" min={0} value={form.data.fee} onChange={(e) => form.setData('fee', e.target.value)} />
                {form.data.mode === 'online' && <Input wrapperClassName="sm:col-span-2" label={t('Meeting link')} type="url" value={form.data.meeting_link} onChange={(e) => form.setData('meeting_link', e.target.value)} error={form.errors.meeting_link} placeholder="https://" />}
                <Textarea wrapperClassName="sm:col-span-2" label={t('Notes')} rows={2} value={form.data.lawyer_notes} onChange={(e) => form.setData('lawyer_notes', e.target.value)} />
            </div>
        </Modal>
    );
}

function TransitionDialog({ action, onClose }: { action: { a: Appointment; status: string } | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ reason: '', meeting_link: '' });
    const needsReason = action && ['declined', 'cancelled'].includes(action.status);
    function submit() {
        if (!action) return;
        form.transform((d) => ({ status: action.status, reason: d.reason || null, meeting_link: d.meeting_link || null }));
        form.post(route('appointments.transition', action.a.id), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    }
    return (
        <Modal open={!!action} onClose={() => { form.reset(); form.clearErrors(); onClose(); }} size="sm" title={action?.status === 'confirmed' ? t('Confirm appointment') : action?.status === 'declined' ? t('Decline request') : t('Cancel appointment')} footer={<><Button variant="secondary" onClick={onClose}>{t('Back')}</Button><Button variant={needsReason ? 'danger' : 'success'} loading={form.processing} disabled={!!needsReason && form.data.reason.trim().length < 3} onClick={submit}>{needsReason ? (action?.status === 'declined' ? t('Decline request') : t('Cancel appointment')) : t('Confirm')}</Button></>}>
            {needsReason ? <Textarea label={t('Reason')} rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} required hint={t('The client sees this reason.')} autoFocus /> : action?.a.mode === 'online' ? <Input label={t('Meeting link')} type="url" value={form.data.meeting_link} onChange={(e) => form.setData('meeting_link', e.target.value)} error={form.errors.meeting_link} placeholder="https://" /> : <p className="text-sm">{t('The client will be notified.')}</p>}
        </Modal>
    );
}

function MoveDialog({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ starts_at: '', reason: '' });
    return (
        <Modal open={!!appointment} onClose={onClose} size="sm" title={t('Reschedule appointment')} footer={<><Button variant="secondary" onClick={onClose}>{t('Back')}</Button><Button loading={form.processing} onClick={() => appointment && form.post(route('appointments.reschedule', appointment.id), { preserveScroll: true, onSuccess: onClose })}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                <Input label={t('New date & time')} type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} error={form.errors.starts_at} />
                <Input label={t('Reason (optional)')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} hint={t('The client is notified by email and WhatsApp (if they agreed).')} />
            </div>
        </Modal>
    );
}

function AppointmentRow({ a, canManageAll, onAction, onMove }: { a: Appointment; canManageAll: boolean; onAction: (status: string) => void; onMove: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const when = new Date(a.starts_at);
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    const accent: Record<string, string> = { requested: 'bg-gold-500', confirmed: 'bg-verdant-500', completed: 'bg-navy-400', cancelled: 'bg-red-400', declined: 'bg-red-400', no_show: 'bg-navy-300' };
    return (
        <li className="relative grid gap-4 px-5 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-start">
            <span className={cn('absolute inset-y-3 start-0 w-1 rounded-e-full', accent[a.status] ?? 'bg-navy-200')} aria-hidden />
            <div className="flex items-center gap-3 sm:block sm:text-center">
                <div className="w-16 shrink-0 overflow-hidden rounded-xl border border-navy-100 text-center dark:border-navy-700">
                    <p className="bg-navy-900 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-gold-500 dark:text-navy-950">{new Intl.DateTimeFormat(intl, { month: 'short' }).format(when)}</p>
                    <p className="py-1 text-2xl font-semibold tabular-nums leading-tight">{when.getDate()}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums sm:mt-1.5">{new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(when)}</p>
            </div>
            <div className="min-w-0 space-y-1.5">
                <p className="truncate font-semibold text-navy-900 dark:text-white">{a.contact_name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-600 dark:text-navy-300">
                    <span className="inline-flex items-center gap-1">{a.mode === 'online' ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}{a.mode_label}</span>
                    {a.contact_phone && <a href={`tel:${a.contact_phone}`} className="ltr-nums inline-flex items-center gap-1 hover:underline"><Phone className="size-3.5" />{a.contact_phone}</a>}
                    {canManageAll && <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" />{a.lawyer}</span>}
                    {a.fee && <span className="inline-flex items-center gap-1"><Wallet className="size-3.5" />PKR {Number(a.fee).toLocaleString()}</span>}
                </div>
                {a.client_message && <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-700 dark:bg-navy-800 dark:text-navy-200">{a.client_message}</p>}
                {a.meeting_link && <a href={a.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-navy-800 underline dark:text-navy-100"><Video className="size-4" />{t('Join meeting')}</a>}
                {a.cancellation_reason && <p className="text-xs text-red-700 dark:text-red-300">{t('Reason')}: {a.cancellation_reason}</p>}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
                <StatusBadge value={a.status} label={a.status_label} />
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {a.status === 'requested' && <><Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={() => onAction('confirmed')}>{t('Confirm')}</Button><Button size="sm" variant="secondary" onClick={() => onAction('declined')}>{t('Decline')}</Button></>}
                    {a.status === 'confirmed' && <><Button size="sm" variant="secondary" onClick={() => router.post(route('appointments.transition', a.id), { status: 'completed' }, { preserveScroll: true })}>{t('Mark completed')}</Button><Button size="sm" variant="ghost" onClick={() => router.post(route('appointments.transition', a.id), { status: 'no_show' }, { preserveScroll: true })}>{t('No-show')}</Button><Button size="sm" variant="ghost" onClick={() => onAction('cancelled')}>{t('Cancel')}</Button></>}
                    {['requested', 'confirmed'].includes(a.status) && <Button size="sm" variant="ghost" icon={<CalendarClock className="size-4" />} onClick={onMove}>{t('Reschedule')}</Button>}
                </div>
            </div>
        </li>
    );
}
