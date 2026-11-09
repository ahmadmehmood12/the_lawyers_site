import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { colorFor } from './colors';
import { dayOf, fmt, fmtTime, minutesOf, parseIso } from './dates';
import { EventChip, OriginalTime, statusClasses } from './EventChip';
import type { CalendarItem } from './types';

const HOUR = 48; // px per hour

type Placed = { item: CalendarItem; top: number; height: number; column: number; columns: number };

/** Lays out overlapping timed items side by side (greedy columns per overlap cluster). */
function place(items: CalendarItem[]): Placed[] {
    const sorted = [...items].sort((a, b) => minutesOf(a.start) - minutesOf(b.start) || minutesOf(b.end) - minutesOf(a.end));
    const placed: Placed[] = [];
    let cluster: Placed[] = [];
    let clusterEnd = -1;

    const flush = () => {
        const columns = Math.max(1, ...cluster.map((p) => p.column + 1));
        cluster.forEach((p) => (p.columns = columns));
        placed.push(...cluster);
        cluster = [];
    };

    for (const item of sorted) {
        const start = minutesOf(item.start);
        const endRaw = dayOf(item.end) === dayOf(item.start) ? minutesOf(item.end) : 24 * 60;
        const end = Math.max(start + 25, endRaw);
        if (start >= clusterEnd && cluster.length) flush();
        const used = new Set(cluster.filter((p) => p.top + p.height > (start / 60) * HOUR).map((p) => p.column));
        let column = 0;
        while (used.has(column)) column++;
        cluster.push({ item, top: (start / 60) * HOUR, height: Math.max(22, ((end - start) / 60) * HOUR), column, columns: 1 });
        clusterEnd = Math.max(clusterEnd, end);
    }
    if (cluster.length) flush();
    return placed;
}

/** Week and day views: all-day row on top, scrollable 24-hour grid that opens at 8 am. */
export function TimeGrid({ days, today, items, onOpen, onCreate }: { days: string[]; today: string; items: CalendarItem[]; onOpen: (item: CalendarItem) => void; onCreate?: (date: string, time: string) => void }) {
    const t = useT();
    const { locale } = useLocale();
    const scroller = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (scroller.current) scroller.current.scrollTop = HOUR * 7.5;
        const timer = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const allDay = (day: string) => items.filter((i) => i.all_day && dayOf(i.start) === day);
    const timed = (day: string) => items.filter((i) => !i.all_day && dayOf(i.start) === day);
    const hasAllDay = days.some((d) => allDay(d).length > 0);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

    return (
        <div className="flex h-full min-h-[560px] flex-col overflow-x-auto">
            <div className={cn('min-w-0', days.length > 1 && 'min-w-[720px]')}>
                <div className="grid border-b border-navy-100 dark:border-navy-800" style={{ gridTemplateColumns: columns }}>
                    <div />
                    {days.map((day) => (
                        <div key={day} className="px-1 py-2 text-center">
                            <p className="text-xs text-navy-500 dark:text-navy-400">{fmt(day, locale, { weekday: 'short' })}</p>
                            <p className={cn('ltr-nums mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-base font-semibold tabular-nums', day === today ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-900 dark:text-white')}>{parseIso(day).getDate()}</p>
                        </div>
                    ))}
                </div>
                {hasAllDay && (
                    <div className="grid border-b border-navy-100 dark:border-navy-800" style={{ gridTemplateColumns: columns }}>
                        <div className="px-1 py-1.5 text-end text-[10px] text-navy-500">{t('All day')}</div>
                        {days.map((day) => (
                            <div key={day} className="flex min-w-0 flex-col gap-0.5 border-s border-navy-100 p-1 dark:border-navy-800">
                                {allDay(day).map((item) => <EventChip key={item.key} item={item} onOpen={onOpen} />)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div ref={scroller} className={cn('relative min-h-0 flex-1 overflow-y-auto', days.length > 1 && 'min-w-[720px]')} style={{ maxHeight: 'calc(100dvh - 15rem)' }}>
                <div className="grid" style={{ gridTemplateColumns: columns, height: HOUR * 24 }}>
                    <div className="relative">
                        {Array.from({ length: 24 }, (_, h) => (
                            <span key={h} className="ltr-nums absolute end-2 -translate-y-1/2 text-[10px] text-navy-400 tabular-nums" style={{ top: h * HOUR }}>
                                {h === 0 ? '' : fmt(`2000-01-01T${String(h).padStart(2, '0')}:00`, locale, { hour: 'numeric' })}
                            </span>
                        ))}
                    </div>
                    {days.map((day) => (
                        <div key={day} className="relative border-s border-navy-100 dark:border-navy-800">
                            {Array.from({ length: 24 }, (_, h) => (
                                <button
                                    key={h}
                                    type="button"
                                    tabIndex={-1}
                                    aria-hidden
                                    onDoubleClick={() => onCreate?.(day, `${String(h).padStart(2, '0')}:00`)}
                                    className="absolute inset-x-0 border-t border-navy-100/80 hover:bg-navy-50/60 dark:border-navy-800/80 dark:hover:bg-navy-800/30"
                                    style={{ top: h * HOUR, height: HOUR }}
                                />
                            ))}
                            {day === today && <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-500" style={{ top: (nowMinutes / 60) * HOUR }} aria-hidden />}
                            {place(timed(day)).map(({ item, top, height, column, columns: count }) => {
                                const color = colorFor(item.type);
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => onOpen(item)}
                                        className={cn('absolute z-10 overflow-hidden rounded-md border border-white/40 px-1.5 py-1 text-start text-[11px] leading-tight shadow-sm transition hover:z-30 hover:brightness-110 dark:border-navy-950/40', color.block, statusClasses(item))}
                                        style={{ top, height, insetInlineStart: `calc(${(column / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)` }}
                                    >
                                        <span className={cn('block truncate font-semibold', (item.status === 'cancelled' || item.ghost) && 'line-through')}>{item.title}</span>
                                        <span className="ltr-nums block truncate opacity-90">{fmtTime(item.start, locale)}{item.location && height > 40 ? `, ${item.location}` : ''}</span>
                                        {height > 52 && item.original_start && <span className="block rounded bg-white/85 px-1"><OriginalTime item={item} compact /></span>}
                                        {height > 52 && item.ghost && item.moved_to && <span className="block truncate">{t('Moved to :date', { date: fmt(item.moved_to, locale, { day: 'numeric', month: 'short' }) })}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
