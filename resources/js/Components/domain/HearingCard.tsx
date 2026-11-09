import { Link } from '@inertiajs/react';
import { ArrowRight, Clock, History, Landmark, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { HearingSummary } from '@/types/domain';

/** Status accent on the card's leading edge, so scheduled/rescheduled/done/cancelled read at a glance. */
const accent: Record<string, string> = {
    scheduled: 'border-s-navy-700 dark:border-s-navy-300',
    held: 'border-s-verdant-600',
    adjourned: 'border-s-verdant-600',
    rescheduled: 'border-s-amber-500',
    cancelled: 'border-s-red-500',
};

/**
 * Hearing row for the dashboard, court diary and case pages. The time sits in a pill inside the
 * card (no separate time column). A hearing that replaced an earlier date shows that date struck
 * through; the old row of a moved hearing shows where it went.
 */
export function HearingCard({ hearing, actions, showDate = false, onHistory }: { hearing: HearingSummary; actions?: ReactNode; showDate?: boolean; onHistory?: (hearing: HearingSummary) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const moved = hearing.status === 'rescheduled';
    const replaced = !moved && hearing.rescheduled_from;
    const when = (date: string, time: string | null) => `${formatDate(date, locale, { weekday: 'short', day: 'numeric', month: 'short' })}${time ? `, ${formatTime(time, locale)}` : ''}`;

    return (
        <div className={cn('rounded-lg border border-s-4 border-navy-100 bg-white p-3 sm:p-4 dark:border-navy-800 dark:bg-navy-900', accent[hearing.status] ?? accent.scheduled, (moved || hearing.status === 'cancelled') && 'bg-navy-50/60 dark:bg-navy-900/60')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={cn('ltr-nums inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums', moved ? 'bg-navy-100 text-navy-500 line-through dark:bg-navy-800 dark:text-navy-400' : 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>
                        <Clock className="size-3" aria-hidden />
                        {showDate && `${formatDate(hearing.hearing_date, locale, { day: 'numeric', month: 'short' })}, `}
                        {hearing.hearing_time ? formatTime(hearing.hearing_time, locale) : t('Time not set')}
                    </span>
                    {hearing.case ? (
                        <Link href={route('cases.show', { case: hearing.case.id, tab: 'hearings' })} className={cn('min-w-0 font-semibold text-navy-900 hover:underline dark:text-white', moved && 'text-navy-500 line-through dark:text-navy-400')}>
                            {hearing.case.title}
                        </Link>
                    ) : (
                        <span className="font-semibold">{hearing.purpose}</span>
                    )}
                </div>
                <StatusBadge value={hearing.status} label={hearing.status_label} />
            </div>

            {hearing.case && <p className="ltr-nums mt-1 text-xs text-navy-500">{hearing.case.case_number || hearing.case.reference}</p>}

            {replaced && hearing.rescheduled_from && (
                <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    <History className="size-3.5" aria-hidden />
                    <s>{when(hearing.rescheduled_from.hearing_date, hearing.rescheduled_from.hearing_time)}</s>
                    <ArrowRight className="size-3 rtl:rotate-180" aria-hidden />
                    <strong className="font-semibold">{when(hearing.hearing_date, hearing.hearing_time)}</strong>
                    {hearing.rescheduled_from.reason && <span className="text-amber-700 dark:text-amber-300">({hearing.rescheduled_from.reason})</span>}
                </p>
            )}
            {moved && hearing.rescheduled_to && (
                <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    <History className="size-3.5" aria-hidden />
                    {t('Moved to')} <strong className="font-semibold">{when(hearing.rescheduled_to.hearing_date, hearing.rescheduled_to.hearing_time)}</strong>
                    {hearing.reschedule_reason && <span>({hearing.reschedule_reason})</span>}
                </p>
            )}
            {hearing.status === 'cancelled' && hearing.cancellation_reason && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{t('Cancelled: :reason', { reason: hearing.cancellation_reason })}</p>}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-600 dark:text-navy-300">
                {hearing.court && <span className="inline-flex items-center gap-1"><Landmark className="size-3.5" />{hearing.court}{hearing.courtroom ? `, ${t('Room')} ${hearing.courtroom}` : ''}</span>}
                {(hearing.purpose || hearing.hearing_type_label) && <span>{hearing.purpose || hearing.hearing_type_label}</span>}
                {hearing.assigned_lawyer && <span className="inline-flex items-center gap-1"><User className="size-3.5" />{hearing.assigned_lawyer}</span>}
            </div>
            {hearing.preparation_notes && !moved && <p className="mt-2 rounded bg-gold-50 px-2 py-1 text-xs text-gold-700 dark:bg-gold-700/20 dark:text-gold-200">{hearing.preparation_notes}</p>}
            {(actions || (onHistory && (replaced || moved))) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {actions}
                    {onHistory && (replaced || moved) && (
                        <button type="button" onClick={() => onHistory(hearing)} className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:underline dark:text-navy-300">
                            <History className="size-3.5" />{t('History')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
