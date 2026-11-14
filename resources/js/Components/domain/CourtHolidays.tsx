import { Link } from '@inertiajs/react';
import { CalendarOff, Moon, Sun } from 'lucide-react';
import { Card, CardHeader } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';

export type CourtHoliday = { id: number; title: string; starts_on: string; ends_on: string; days: number; kind: string; province: string | null; tentative: boolean; notes: string | null };

function dateParts(iso: string, locale: string) {
    const d = new Date(`${iso}T00:00:00`);
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    return { day: d.getDate(), month: new Intl.DateTimeFormat(intl, { month: 'short' }).format(d), weekday: new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(d), full: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short' }).format(d) };
}

/** Upcoming court holidays and vacations from Admin, Court calendar. */
export function CourtHolidayList({ holidays, compact }: { holidays: CourtHoliday[]; compact?: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    const todayIso = new Date().toISOString().slice(0, 10);
    return (
        <ul className={cn('divide-y divide-navy-100 dark:divide-navy-800', compact && 'text-sm')}>
            {holidays.map((h) => {
                const start = dateParts(h.starts_on, locale);
                const end = dateParts(h.ends_on, locale);
                const now = h.starts_on <= todayIso && h.ends_on >= todayIso;
                const vacation = h.kind === 'court_vacation';
                return (
                    <li key={h.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={cn('grid w-12 shrink-0 overflow-hidden rounded-lg border text-center', vacation ? 'border-gold-200 dark:border-gold-500/30' : 'border-red-200 dark:border-red-500/30')}>
                            <span className={cn('py-0.5 text-[10px] font-semibold uppercase', vacation ? 'bg-gold-500 text-navy-950' : 'bg-red-500 text-white')}>{start.month}</span>
                            <span className="py-0.5 text-lg font-semibold tabular-nums">{start.day}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 font-medium text-navy-900 dark:text-white">
                                <span className="truncate">{h.title}</span>
                                {h.tentative && <Moon className="size-3.5 shrink-0 text-navy-400" aria-label={t('Subject to moon sighting')} />}
                            </span>
                            <span className="block truncate text-xs text-navy-500">
                                {h.days > 1 ? `${start.full} – ${end.full} · ${t(':count days', { count: h.days })}` : start.weekday}
                                {h.province ? ` · ${h.province}` : ''}
                            </span>
                        </span>
                        {now ? <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{t('Today')}</span>
                            : <span className={cn('inline-flex shrink-0 items-center gap-1 text-[11px]', vacation ? 'text-gold-700 dark:text-gold-300' : 'text-navy-500')}>{vacation ? <Sun className="size-3.5" /> : <CalendarOff className="size-3.5" />}{vacation ? t('Vacation') : t('Courts closed')}</span>}
                    </li>
                );
            })}
        </ul>
    );
}

export function CourtHolidaysCard({ holidays }: { holidays: CourtHoliday[] }) {
    const t = useT();
    if (!holidays?.length) return null;
    return (
        <Card>
            <CardHeader title={t('Court holidays ahead')} description={t('Courts are closed on these days.')} actions={<Link href={route('calendar.index')} className="text-xs font-medium text-navy-600 hover:underline dark:text-navy-300">{t('Calendar')}</Link>} />
            <CourtHolidayList holidays={holidays} compact />
        </Card>
    );
}
