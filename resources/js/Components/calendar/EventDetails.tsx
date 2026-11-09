import { Link, router } from '@inertiajs/react';
import { Briefcase, CalendarClock, Check, ExternalLink, History, MapPin, Repeat, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { colorFor } from './colors';
import { fmtWhen } from './dates';
import type { CalendarItem, HistoryStep } from './types';

const statusTone = { scheduled: 'navy', rescheduled: 'amber', completed: 'green', cancelled: 'red' } as const;

/** Everything about one item, its scheduling history, and the actions the user may take. */
export function EventDetails({ item, onClose, onEdit, onReschedule, onCancel, onChanged }: {
    item: CalendarItem | null;
    onClose: () => void;
    onEdit: (item: CalendarItem) => void;
    onReschedule: (item: CalendarItem) => void;
    onCancel: (item: CalendarItem) => void;
    onChanged: () => void;
}) {
    const t = useT();
    const { locale } = useLocale();
    const [history, setHistory] = useState<HistoryStep[] | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        setHistory(null);
        setShowHistory(false);
    }, [item?.key]);

    function loadHistory() {
        if (!item) return;
        setShowHistory(true);
        if (history) return;
        const source = item.source === 'appointment' ? 'appointment' : item.source === 'hearing' ? 'hearing' : 'event';
        fetch(route('calendar.history', { source, id: item.id }), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : { steps: [] }))
            .then((data: { steps: HistoryStep[] }) => setHistory(data.steps))
            .catch(() => setHistory([]));
    }

    if (!item) return null;
    const color = colorFor(item.type);
    const canHistory = item.has_history && ['hearing', 'appointment', 'event'].includes(item.source);

    return (
        <Modal open onClose={onClose} title={<span className={cn((item.status === 'cancelled' || item.ghost) && 'line-through')}>{item.title}</span>} size="md">
            <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('size-2.5 rounded-full', color.dot)} aria-hidden />
                    <Badge tone={statusTone[item.status]}>{item.ghost ? t('Moved') : item.status_label}</Badge>
                    {item.recurrence_label && <Badge><Repeat className="me-1 inline size-3" />{item.recurrence_label}</Badge>}
                </div>

                <div className="rounded-lg bg-navy-50 p-3 dark:bg-navy-800/60">
                    {item.ghost ? (
                        <>
                            <p className="text-navy-500 line-through">{fmtWhen(item.start, locale, item.all_day)}</p>
                            {item.moved_to && <p className="mt-1 text-base font-semibold text-navy-900 dark:text-white">{t('Moved to :date', { date: fmtWhen(item.moved_to, locale, item.all_day) })}</p>}
                        </>
                    ) : (
                        <>
                            {item.original_start && <p className="text-amber-700 dark:text-amber-300"><s>{fmtWhen(item.original_start, locale, item.all_day)}</s> <span className="text-xs">{t('original date')}</span></p>}
                            <p className="text-base font-semibold text-navy-900 dark:text-white">{fmtWhen(item.start, locale, item.all_day)}</p>
                        </>
                    )}
                    {item.reason && <p className="mt-1 text-xs text-navy-600 dark:text-navy-300">{t('Reason: :reason', { reason: item.reason })}</p>}
                </div>

                <dl className="space-y-2">
                    {item.subtitle && <p className="text-navy-700 dark:text-navy-200">{item.subtitle}</p>}
                    {item.location && <Row icon={<MapPin className="size-4" />} label={t('Location')}>{item.location}</Row>}
                    {item.case && <Row icon={<Briefcase className="size-4" />} label={t('Case')}>{item.case.title} <span className="ltr-nums text-navy-500">({item.case.reference})</span></Row>}
                    {item.client && <Row icon={<Users className="size-4" />} label={t('Client')}>{item.client}</Row>}
                    {item.lawyer && <Row icon={<User className="size-4" />} label={t('Lawyer')}>{item.lawyer}</Row>}
                    {item.description && <p className="whitespace-pre-line text-navy-700 dark:text-navy-200">{item.description}</p>}
                </dl>

                {canHistory && (
                    <div>
                        <button type="button" onClick={loadHistory} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">
                            <History className="size-4" />{t('Scheduling history')}
                        </button>
                        {showHistory && (
                            <ol className="mt-2 space-y-2 border-s-2 border-navy-100 ps-4 dark:border-navy-800">
                                {history === null ? <li className="text-xs text-navy-500">{t('Loading…')}</li> : history.map((step, i) => (
                                    <li key={i} className={cn('relative', step.current && 'font-medium')}>
                                        <span className={cn('absolute -start-[1.4rem] top-1.5 size-2.5 rounded-full', step.current ? 'bg-navy-900 dark:bg-gold-400' : 'bg-navy-300')} aria-hidden />
                                        {step.when && <p className={cn(!step.current && ['rescheduled', 'cancelled'].includes(step.status) && 'line-through', 'text-navy-900 dark:text-white')}>{fmtWhen(step.when, locale, step.all_day)}</p>}
                                        <p className="text-xs text-navy-500 dark:text-navy-400">{[step.action, step.label, step.by ? t('by :name', { name: step.by }) : null].filter(Boolean).join(', ')}</p>
                                        {step.reason && <p className="text-xs text-navy-600 dark:text-navy-300">{step.reason}</p>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-navy-100 pt-4 dark:border-navy-800">
                    {item.can.reschedule && <Button size="sm" icon={<CalendarClock className="size-4" />} onClick={() => onReschedule(item)}>{t('Reschedule')}</Button>}
                    {item.can.edit && <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>{t('Edit')}</Button>}
                    {item.can.complete && <Button size="sm" variant="secondary" icon={<Check className="size-4" />} onClick={() => router.post(route('calendar.complete', item.id), {}, { preserveScroll: true, onSuccess: () => { onChanged(); onClose(); } })}>{t('Mark done')}</Button>}
                    {item.can.cancel && <Button size="sm" variant="ghost" onClick={() => onCancel(item)}>{t('Cancel event')}</Button>}
                    {item.url && <Link href={item.url} className="ms-auto inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">{item.source === 'hearing' ? t('Open case') : t('Open')}<ExternalLink className="size-3.5" /></Link>}
                    {item.manage_url && item.manage_url !== item.url && <Link href={item.manage_url} className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">{item.source === 'hearing' || item.source === 'note' ? t('Court diary') : t('Manage')}</Link>}
                </div>
            </div>
        </Modal>
    );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 text-navy-400">{icon}</span>
            <div><dt className="sr-only">{label}</dt><dd className="text-navy-800 dark:text-navy-100">{children}</dd></div>
        </div>
    );
}
