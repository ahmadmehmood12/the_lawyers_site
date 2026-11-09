import { Check, History, Repeat, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { colorFor } from './colors';
import { fmt, fmtTime } from './dates';
import type { CalendarItem } from './types';

/** Marks shared by every view: ghosts are faded and dashed, cancelled are struck, rescheduled get an amber ring. */
export function statusClasses(item: CalendarItem): string {
    if (item.ghost) return 'border-dashed opacity-60';
    if (item.status === 'cancelled') return 'opacity-60';
    if (item.status === 'completed') return 'opacity-75';
    if (item.status === 'rescheduled') return 'ring-1 ring-amber-400 dark:ring-amber-500/70';
    return '';
}

/** "Was 3 Nov, 9:30 am" struck through, for items that replaced an earlier date. */
export function OriginalTime({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    if (!item.original_start) return null;
    const label = fmt(item.original_start, locale, item.all_day ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return (
        <span className={cn('inline-flex items-center gap-1 text-amber-700 dark:text-amber-300', compact ? 'text-[10px]' : 'text-xs')}>
            <History className="size-3 shrink-0" aria-hidden />
            <span className="sr-only">{t('Originally')}</span>
            <s className="decoration-1">{label}</s>
        </span>
    );
}

/** Compact chip used in the month grid and all-day rows. */
export function EventChip({ item, onOpen }: { item: CalendarItem; onOpen: (item: CalendarItem) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const color = colorFor(item.type);

    return (
        <button
            type="button"
            onClick={() => onOpen(item)}
            className={cn('flex w-full min-w-0 flex-col rounded border border-transparent border-s-[3px] px-1.5 py-0.5 text-start text-[11px] leading-tight transition hover:brightness-95', color.chip, statusClasses(item))}
            title={item.title}
        >
            <span className="flex min-w-0 items-center gap-1">
                {!item.all_day && <span className="ltr-nums shrink-0 font-semibold tabular-nums">{fmtTime(item.start, locale)}</span>}
                <span className={cn('truncate font-medium', (item.status === 'cancelled' || item.ghost) && 'line-through')}>{item.title}</span>
                {item.recurrence !== 'none' && <Repeat className="size-3 shrink-0" aria-label={t('Repeats')} />}
                {item.status === 'completed' && <Check className="size-3 shrink-0" aria-label={t('Completed')} />}
                {item.status === 'cancelled' && <X className="size-3 shrink-0" aria-label={t('Cancelled')} />}
            </span>
            {item.ghost && item.moved_to && <span className="truncate text-[10px]">{t('Moved to :date', { date: fmt(item.moved_to, locale, { day: 'numeric', month: 'short' }) })}</span>}
            {!item.ghost && item.original_start && <OriginalTime item={item} compact />}
        </button>
    );
}
