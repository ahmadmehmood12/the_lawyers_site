import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/i18n';

type Props = {
    month: string; // YYYY-MM
    counts: Record<string, number>;
    selected?: string;
    onSelect: (date: string) => void;
    onNavigate: (month: string) => void;
    renderDay?: (date: string) => ReactNode;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Month grid used by the court diary. Weeks start on Monday (Pakistani courts sit Mon–Sat). */
export function MonthCalendar({ month, counts, selected, onSelect, onNavigate }: Props) {
    const { locale } = useLocale();
    const [year, monthIndex] = month.split('-').map(Number);
    const first = new Date(year, monthIndex - 1, 1);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK';
    const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));
    const shift = (delta: number) => {
        const d = new Date(year, monthIndex - 1 + delta, 1);
        onNavigate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    };

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => shift(-1)} className="rounded-md p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label="Previous month">
                    <ChevronLeft className="size-4 rtl:rotate-180" />
                </button>
                <p className="font-semibold">{new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }).format(first)}</p>
                <button type="button" onClick={() => shift(1)} className="rounded-md p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label="Next month">
                    <ChevronRight className="size-4 rtl:rotate-180" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-navy-500">
                {weekdays.map((day) => (
                    <div key={day} className="py-1">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => (
                    <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const key = `${month}-${pad(i + 1)}`;
                    const count = counts[key] ?? 0;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onSelect(key)}
                            className={cn(
                                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                                key === selected ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'hover:bg-navy-100 dark:hover:bg-navy-800',
                                key === todayKey && key !== selected && 'ring-1 ring-gold-500',
                            )}
                        >
                            {i + 1}
                            {count > 0 && (
                                <span className={cn('mt-0.5 rounded-full px-1.5 text-[10px] leading-4 font-semibold', key === selected ? 'bg-gold-400 text-navy-950' : 'bg-gold-100 text-gold-700 dark:bg-gold-700/30 dark:text-gold-200')}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
