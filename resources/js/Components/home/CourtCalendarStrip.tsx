import { motion } from 'framer-motion';
import { CalendarOff, Moon, Sun } from 'lucide-react';
import type { CourtHoliday } from '@/Components/domain/CourtHolidays';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { Reveal } from './Reveal';

/** Homepage: the next court holidays and vacations (Admin, Court calendar). Hidden when none. */
export function CourtCalendarStrip({ holidays }: { holidays: CourtHoliday[] }) {
    const t = useT();
    const { locale } = useLocale();
    if (!holidays?.length) return null;
    const intl = locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl, o).format(new Date(`${iso}T00:00:00`));

    return (
        <section className="border-t border-navy-100 py-16 lg:py-24 dark:border-navy-800" aria-labelledby="hm-court-calendar">
            <div className="hm-wrap">
                <Reveal className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 id="hm-court-calendar" className="text-4xl font-semibold sm:text-5xl">{t('Court calendar')}</h2>
                        <p className="mt-3 max-w-xl text-lg text-navy-600 dark:text-navy-300">{t('Upcoming days when courts are closed, so you can plan hearings and visits.')}</p>
                    </div>
                    <p className="inline-flex items-center gap-1.5 text-sm text-navy-500"><Moon className="size-4" />{t('Islamic dates are subject to moon sighting.')}</p>
                </Reveal>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {holidays.map((h, i) => {
                        const vacation = h.kind === 'court_vacation';
                        return (
                            <Reveal key={h.id} delay={i * 0.06}>
                                <motion.article whileHover={{ y: -3 }} className="flex h-full gap-4 rounded-card border border-navy-100 bg-white p-5 shadow-card dark:border-navy-800 dark:bg-navy-900">
                                    <div className={cn('grid w-16 shrink-0 overflow-hidden rounded-xl border text-center', vacation ? 'border-gold-200' : 'border-red-200 dark:border-red-500/30')}>
                                        <span className={cn('py-1 text-xs font-semibold uppercase', vacation ? 'bg-gold-500 text-navy-950' : 'bg-red-500 text-white')}>{fmt(h.starts_on, { month: 'short' })}</span>
                                        <span className="py-1.5 font-serif text-3xl font-semibold tabular-nums">{fmt(h.starts_on, { day: 'numeric' })}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="flex items-center gap-1.5 text-lg font-semibold leading-snug">{h.title}{h.tentative && <Moon className="size-4 shrink-0 text-navy-400" aria-label={t('Subject to moon sighting')} />}</h3>
                                        <p className="mt-1 text-sm text-navy-600 dark:text-navy-300">
                                            {h.days > 1 ? `${fmt(h.starts_on, { day: 'numeric', month: 'short' })} – ${fmt(h.ends_on, { day: 'numeric', month: 'short' })}` : fmt(h.starts_on, { weekday: 'long' })}
                                            {h.days > 1 && ` · ${t(':count days', { count: h.days })}`}
                                        </p>
                                        <p className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', vacation ? 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300')}>
                                            {vacation ? <Sun className="size-3.5" /> : <CalendarOff className="size-3.5" />}{vacation ? t('Court vacation') : t('Courts closed')}{h.province ? ` · ${h.province}` : ''}
                                        </p>
                                    </div>
                                </motion.article>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
