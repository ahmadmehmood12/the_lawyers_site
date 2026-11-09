import { useEffect, useState } from 'react';
import type { HistoryStep } from '@/Components/calendar/types';
import { Modal } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { HearingSummary } from '@/types/domain';

/** Every date a hearing was fixed for, oldest first (reads GET /calendar/history/hearing/{id}). */
export function HearingHistoryDialog({ hearing, onClose }: { hearing: HearingSummary | null; onClose: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const [steps, setSteps] = useState<HistoryStep[] | null>(null);

    useEffect(() => {
        if (!hearing) return;
        setSteps(null);
        fetch(route('calendar.history', { source: 'hearing', id: hearing.id }), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : { steps: [] }))
            .then((data: { steps: HistoryStep[] }) => setSteps(data.steps))
            .catch(() => setSteps([]));
    }, [hearing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!hearing) return null;

    return (
        <Modal open onClose={onClose} title={t('Hearing history')} description={hearing.case?.title} size="sm">
            {steps === null ? <p className="text-sm text-navy-500">{t('Loading…')}</p> : (
                <ol className="space-y-3 border-s-2 border-navy-100 ps-4 dark:border-navy-800">
                    {steps.map((step, i) => {
                        const struck = !step.current && ['rescheduled', 'cancelled'].includes(step.status);
                        return (
                            <li key={i} className="relative text-sm">
                                <span className={cn('absolute -start-[1.45rem] top-1.5 size-3 rounded-full ring-2 ring-white dark:ring-navy-900', step.current ? 'bg-navy-900 dark:bg-gold-400' : 'bg-navy-300')} aria-hidden />
                                {step.when && (
                                    <p className={cn('font-medium text-navy-900 dark:text-white', struck && 'text-navy-500 line-through')}>
                                        {formatDate(step.when.slice(0, 10), locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        {!step.all_day && `, ${formatTime(step.when.slice(11, 16), locale)}`}
                                    </p>
                                )}
                                <p className="text-xs text-navy-500 dark:text-navy-400">{[step.action, step.label, step.by ? t('by :name', { name: step.by }) : null].filter(Boolean).join(', ')}</p>
                                {step.reason && <p className="text-xs text-navy-600 dark:text-navy-300">{t('Reason: :reason', { reason: step.reason })}</p>}
                            </li>
                        );
                    })}
                </ol>
            )}
        </Modal>
    );
}
