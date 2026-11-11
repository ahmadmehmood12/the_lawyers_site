import { useForm } from '@inertiajs/react';
import { CalendarClock, History, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Stagger, StaggerItem } from '@/Components/motion';
import { Avatar, Button, Card, ConfirmAction, EmptyState, LinkButton, Modal, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Appointment = {
    id: number;
    starts_at: string;
    ends_at: string;
    status: string;
    status_label: string;
    mode: string;
    mode_value: string;
    lawyer: string;
    lawyer_avatar: string | null;
    meeting_link: string | null;
    cancellable: boolean;
    reschedulable: boolean;
    cancellation_reason: string | null;
    rescheduled_from: string | null;
};

/**
 * Portal, Appointments: upcoming and past consultations. A client can cancel (with a reason)
 * or ask for a new time from the lawyer's free slots; the lawyer then confirms the new time.
 */
export default function PortalAppointments({ appointments }: { appointments: Appointment[] }) {
    const t = useT();
    const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
    const now = Date.now();
    const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() >= now).reverse();
    const past = appointments.filter((a) => new Date(a.starts_at).getTime() < now);

    return (
        <AppLayout title={t('Appointments')} area="portal">
            <PageHeader title={t('Appointments')} actions={<LinkButton href={route('lawyers.index')} variant="secondary">{t('Book a consultation')}</LinkButton>} />
            {appointments.length === 0 ? (
                <Card><EmptyState icon={<CalendarClock className="size-5" />} title={t('No appointments')} description={t('Find a verified lawyer and pick a time that suits you.')} /></Card>
            ) : (
                <div className="space-y-8">
                    {upcoming.length > 0 && <Group title={t('Upcoming')} items={upcoming} onReschedule={setRescheduling} />}
                    {past.length > 0 && <Group title={t('Past')} items={past} onReschedule={setRescheduling} />}
                </div>
            )}
            {rescheduling && <RescheduleDialog key={rescheduling.id} appointment={rescheduling} onClose={() => setRescheduling(null)} />}
        </AppLayout>
    );
}

function Group({ title, items, onReschedule }: { title: string; items: Appointment[]; onReschedule: (a: Appointment) => void }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <section>
            <h2 className="mb-3 text-sm font-semibold text-navy-600 dark:text-navy-300">{title}</h2>
            <Stagger className="space-y-3">
                {items.map((a) => (
                    <StaggerItem key={a.id}>
                        <Card className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                            <Avatar name={a.lawyer} src={a.lawyer_avatar} size="md" />
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-semibold text-navy-900 dark:text-white">{a.lawyer}</p>
                                <p className="ltr-nums text-navy-700 dark:text-navy-200">{formatDateTime(a.starts_at, locale)}, {a.mode}</p>
                                {a.rescheduled_from && <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><History className="size-3.5" />{t('Moved from :date', { date: formatDateTime(a.rescheduled_from, locale) })}</p>}
                                {a.cancellation_reason && <p className="mt-1 text-xs text-navy-500">{t('Reason')}: {a.cancellation_reason}</p>}
                                {a.meeting_link && <a href={a.meeting_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"><Video className="size-3.5" />{t('Join meeting')}</a>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge value={a.status} label={a.status_label} />
                                {a.reschedulable && <Button size="sm" variant="secondary" onClick={() => onReschedule(a)}>{t('Request a new time')}</Button>}
                                {a.cancellable && <ConfirmAction href={route('portal.appointments.cancel', a.id)} reasonField="reason" title={t('Cancel appointment?')} trigger={(open) => <Button size="sm" variant="ghost" onClick={open}>{t('Cancel')}</Button>} />}
                            </div>
                        </Card>
                    </StaggerItem>
                ))}
            </Stagger>
        </section>
    );
}

function RescheduleDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const [slots, setSlots] = useState<{ starts_at: string; mode: string }[] | null>(null);
    const [failed, setFailed] = useState(false);
    const form = useForm({ starts_at: '', reason: '' });

    useEffect(() => {
        const controller = new AbortController();
        fetch(route('portal.appointments.slots', appointment.id), { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data: { slots: { starts_at: string; mode: string }[] }) => setSlots(data.slots))
            .catch((error) => { if (error?.name !== 'AbortError') setFailed(true); });
        return () => controller.abort();
    }, [appointment.id]);

    const byDay = useMemo(() => {
        const map = new Map<string, { starts_at: string }[]>();
        (slots ?? []).filter((s) => s.mode === 'both' || s.mode === appointment.mode_value).forEach((s) => map.set(s.starts_at.slice(0, 10), [...(map.get(s.starts_at.slice(0, 10)) ?? []), s]));
        return [...map.entries()];
    }, [slots, appointment.mode_value]);

    return (
        <Modal
            open
            onClose={onClose}
            title={t('Request a new time')}
            size="lg"
            footer={<><Button variant="secondary" onClick={onClose}>{t('Close')}</Button><Button disabled={!form.data.starts_at} loading={form.processing} onClick={() => form.post(route('portal.appointments.reschedule', appointment.id), { preserveScroll: true, onSuccess: onClose })}>{t('Send request')}</Button></>}
        >
            <div className="space-y-4">
                <p className="text-sm text-navy-600 dark:text-navy-300">{t(':lawyer will be asked to confirm the new time. Until then your current slot is released.', { lawyer: appointment.lawyer })}</p>
                {failed && <p className="text-sm text-red-600">{t('Could not load free times. Please try again.')}</p>}
                {!slots && !failed && <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-navy-100 dark:bg-navy-800" />)}</div>}
                {slots && byDay.length === 0 && <EmptyState icon={<CalendarClock className="size-5" />} title={t('No open slots in the next two weeks')} description={t('Try messaging the chambers or check back later.')} />}
                {byDay.map(([day, items]) => (
                    <div key={day}>
                        <p className="mb-2 text-sm font-semibold">{formatDate(day, locale, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        <div className="flex flex-wrap gap-2">
                            {items.map((s) => (
                                <button key={s.starts_at} type="button" aria-pressed={form.data.starts_at === s.starts_at} onClick={() => form.setData('starts_at', s.starts_at)} className={cn('ltr-nums rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500', form.data.starts_at === s.starts_at ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950' : 'ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800')}>
                                    {new Date(s.starts_at).toLocaleTimeString(locale === 'ur' ? 'ur-PK' : 'en-PK', { hour: 'numeric', minute: '2-digit' })}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                {form.errors.starts_at && <p className="text-sm text-red-600">{form.errors.starts_at}</p>}
                <Textarea label={t('Reason (optional)')} rows={2} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} />
            </div>
        </Modal>
    );
}
