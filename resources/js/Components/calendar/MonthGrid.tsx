import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { addDays, dayOf, fmt, parseIso } from './dates';
import { EventChip } from './EventChip';
import type { CalendarItem } from './types';

/** Six-week month grid. Each day shows up to three chips and a "+N more" link that opens the day. */
export function MonthGrid({ start, month, today, items, onOpen, onPickDay, onCreate }: { start: string; month: string; today: string; items: CalendarItem[]; onOpen: (item: CalendarItem) => void; onPickDay: (date: string) => void; onCreate?: (date: string) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const byDay = new Map<string, CalendarItem[]>();
    for (const item of items) {
        const key = dayOf(item.start);
        byDay.set(key, [...(byDay.get(key) ?? []), item]);
    }

    return (
        <div className="flex h-full min-h-[560px] flex-col">
            <div className="grid grid-cols-7 border-b border-navy-100 dark:border-navy-800">
                {days.slice(0, 7).map((day) => (
                    <div key={day} className="px-2 py-2 text-center text-xs font-medium text-navy-500 dark:text-navy-400">{fmt(day, locale, { weekday: 'short' })}</div>
                ))}
            </div>
            <div className="grid flex-1 grid-cols-7 grid-rows-6">
                {days.map((day) => {
                    const list = byDay.get(day) ?? [];
                    const outside = day.slice(0, 7) !== month;
                    const isToday = day === today;
                    return (
                        <div
                            key={day}
                            onDoubleClick={() => onCreate?.(day)}
                            className={cn('group flex min-h-24 min-w-0 flex-col gap-0.5 border-e border-b border-navy-100 p-1 dark:border-navy-800', outside && 'bg-navy-50/50 dark:bg-navy-950/40')}
                        >
                            <button
                                type="button"
                                onClick={() => onPickDay(day)}
                                className={cn('ltr-nums mb-0.5 flex size-7 items-center justify-center self-start rounded-full text-xs font-medium tabular-nums hover:bg-navy-100 dark:hover:bg-navy-800', isToday ? 'bg-navy-900 text-white hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950' : outside ? 'text-navy-400' : 'text-navy-800 dark:text-navy-100')}
                                aria-label={fmt(day, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                            >
                                {parseIso(day).getDate()}
                            </button>
                            {list.slice(0, 3).map((item) => <EventChip key={item.key} item={item} onOpen={onOpen} />)}
                            {list.length > 3 && (
                                <button type="button" onClick={() => onPickDay(day)} className="px-1.5 text-start text-[11px] font-medium text-navy-600 hover:underline dark:text-navy-300">
                                    {t('+:count more', { count: list.length - 3 })}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
