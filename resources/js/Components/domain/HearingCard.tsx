import { Link } from '@inertiajs/react';
import { Clock, Landmark, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/Components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { HearingSummary } from '@/types/domain';

/** Compact hearing row used in the dashboard and court diary. Touch-friendly on mobile. */
export function HearingCard({ hearing, actions, showDate = false }: { hearing: HearingSummary; actions?: ReactNode; showDate?: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <div className="flex gap-3 rounded-lg border border-navy-100 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-navy-50 py-2 text-center dark:bg-navy-800">
                {showDate && <span className="text-[11px] font-medium text-navy-500">{formatDate(hearing.hearing_date, locale, { day: 'numeric', month: 'short' })}</span>}
                <span className="ltr-nums text-sm font-semibold text-navy-900 dark:text-white">{hearing.hearing_time ? formatTime(hearing.hearing_time, locale) : '—'}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    {hearing.case ? (
                        <Link href={route('cases.show', { case: hearing.case.id, tab: 'hearings' })} className="font-semibold text-navy-900 hover:underline dark:text-white">
                            {hearing.case.title}
                        </Link>
                    ) : (
                        <span className="font-semibold">{hearing.purpose}</span>
                    )}
                    <StatusBadge value={hearing.status} label={hearing.status_label} />
                </div>
                {hearing.case && <p className="ltr-nums mt-0.5 text-xs text-navy-500">{hearing.case.case_number || hearing.case.reference}</p>}
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-600 dark:text-navy-300">
                    {hearing.court && (
                        <span className="inline-flex items-center gap-1"><Landmark className="size-3.5" />{hearing.court}{hearing.courtroom ? `, ${t('Room')} ${hearing.courtroom}` : ''}</span>
                    )}
                    {(hearing.purpose || hearing.hearing_type_label) && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{hearing.purpose || hearing.hearing_type_label}</span>}
                    {hearing.assigned_lawyer && <span className="inline-flex items-center gap-1"><User className="size-3.5" />{hearing.assigned_lawyer}</span>}
                </div>
                {hearing.preparation_notes && <p className="mt-1.5 rounded bg-gold-50 px-2 py-1 text-xs text-gold-700 dark:bg-gold-700/20 dark:text-gold-200">{hearing.preparation_notes}</p>}
                {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
            </div>
        </div>
    );
}
