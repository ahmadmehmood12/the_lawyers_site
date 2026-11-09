import { CalendarX2, MapPin, Repeat, User } from 'lucide-react';
import { EmptyState } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { colorFor } from './colors';
import { dayOf, fmt, fmtTime } from './dates';
import { OriginalTime, statusClasses } from './EventChip';
import type { CalendarItem } from './types';

/** Day-grouped list (agenda view, and the mobile default). */
export function AgendaList({ items, today, onOpen }: { items: CalendarItem[]; today: string; onOpen: (item: CalendarItem) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const groups = new Map<string, CalendarItem[]>();
    items.forEach((item) => groups.set(dayOf(item.start), [...(groups.get(dayOf(item.start)) ?? []), item]));

    if (items.length === 0) {
        return <EmptyState icon={<CalendarX2 className="size-6" />} title={t('Nothing scheduled')} description={t('Nothing in this period matches your filters.')} />;
    }

    return (
        <ol className="divide-y divide-navy-100 dark:divide-navy-800">
            {[...groups.entries()].map(([day, list]) => (
                <li key={day} className="grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:px-5">
                    <p className={cn('text-sm font-semibold', day === today ? 'text-navy-900 dark:text-gold-300' : 'text-navy-700 dark:text-navy-200')}>
                        {day === today ? t('Today') : fmt(day, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <ul className="space-y-2">
                        {list.map((item) => {
                            const color = colorFor(item.type);
                            return (
                                <li key={item.key}>
                                    <button type="button" onClick={() => onOpen(item)} className={cn('flex w-full items-start gap-3 rounded-lg border border-transparent p-2 text-start hover:bg-navy-50 dark:hover:bg-navy-800/50', statusClasses(item))}>
                                        <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', color.dot)} aria-hidden />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                <span className="ltr-nums rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-semibold text-navy-800 tabular-nums dark:bg-navy-800 dark:text-navy-100">{item.all_day ? t('All day') : fmtTime(item.start, locale)}</span>
                                                <span className={cn('font-medium text-navy-900 dark:text-white', (item.status === 'cancelled' || item.ghost) && 'line-through')}>{item.title}</span>
                                                {item.recurrence !== 'none' && <Repeat className="size-3.5 text-navy-400" aria-label={t('Repeats')} />}
                                                {item.status !== 'scheduled' && <span className="text-xs text-navy-500">{item.ghost ? t('Moved') : item.status_label}</span>}
                                            </span>
                                            {item.ghost && item.moved_to && <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">{t('Moved to :date', { date: fmt(item.moved_to, locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })}</span>}
                                            {!item.ghost && item.original_start && <span className="mt-0.5 block"><OriginalTime item={item} /></span>}
                                            <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-500 dark:text-navy-400">
                                                {item.subtitle && <span>{item.subtitle}</span>}
                                                {item.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{item.location}</span>}
                                                {item.lawyer && <span className="inline-flex items-center gap-1"><User className="size-3" />{item.lawyer}</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </li>
            ))}
        </ol>
    );
}
