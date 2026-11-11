import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, MapPin, Video } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '@/Components/motion';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import { ease } from '@/lib/motion';

/**
 * An interactive preview of booking a consultation (illustrative, never submits). Each step
 * mirrors the real flow: day, time, type, request sent, lawyer accepts. The final button goes
 * to the real lawyer directory.
 */
export function BookingJourney() {
    const t = useT();
    const { locale } = useLocale();
    const days = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
    });
    const times = ['17:00', '17:30', '18:00', '18:30'];
    const [day, setDay] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const [mode, setMode] = useState<'online' | 'in_person'>('online');
    const [stage, setStage] = useState<'pick' | 'sent' | 'confirmed'>('pick');
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK', o).format(d);
    const timeLabel = (hm: string) => fmt(new Date(`2000-01-01T${hm}:00`), { hour: 'numeric', minute: '2-digit' });

    function request() {
        setStage('sent');
        setTimeout(() => setStage('confirmed'), 1600);
    }

    return (
        <section className="border-t border-navy-100 py-20 lg:py-28 dark:border-navy-800" aria-labelledby="hm-booking">
            <div className="hm-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <Reveal>
                    <h2 id="hm-booking" className="text-4xl font-semibold sm:text-5xl">{t('Book a consultation in a minute')}</h2>
                    <p className="mt-4 max-w-md text-lg text-navy-600 dark:text-navy-300">{t('Choose a day and a free slot, online or in chambers. Both of you get the confirmation by email and WhatsApp.')}</p>
                    <Link href={route('lawyers.index')} className="mt-8 inline-flex h-12 items-center rounded-lg bg-navy-900 px-6 font-medium text-white hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400">{t('Find a lawyer to book')}</Link>
                </Reveal>
                <Reveal delay={0.1}>
                    <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-pop sm:p-8 dark:border-navy-800 dark:bg-navy-900" aria-label={t('Booking preview')}>
                        <AnimatePresence mode="wait">
                            {stage === 'pick' ? (
                                <motion.div key="pick" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3, ease }}>
                                    <p className="text-sm font-semibold text-navy-500">{t('1. Choose a day')}</p>
                                    <div className="mt-3 grid grid-cols-5 gap-2">
                                        {days.map((d, i) => (
                                            <button key={i} type="button" onClick={() => { setDay(i); setTime(null); }} aria-pressed={day === i} className={cn('rounded-xl border px-1 py-3 text-center transition-colors', day === i ? 'border-navy-900 bg-navy-900 text-white dark:border-gold-400 dark:bg-gold-400 dark:text-navy-950' : 'border-navy-100 hover:border-navy-300 dark:border-navy-700')}>
                                                <span className="block text-[11px] opacity-80">{fmt(d, { weekday: 'short' })}</span>
                                                <span className="block text-lg font-semibold tabular-nums">{d.getDate()}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-6 text-sm font-semibold text-navy-500">{t('2. Pick a free slot')}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {times.map((hm) => (
                                            <motion.button key={hm} type="button" whileTap={{ scale: 0.97 }} onClick={() => setTime(hm)} aria-pressed={time === hm} className={cn('rounded-lg border py-2 text-sm font-medium tabular-nums transition-colors', time === hm ? 'border-verdant-600 bg-verdant-50 text-verdant-800 dark:bg-verdant-900/30 dark:text-verdant-200' : 'border-navy-100 hover:border-navy-300 dark:border-navy-700')}>{timeLabel(hm)}</motion.button>
                                        ))}
                                    </div>
                                    <p className="mt-6 text-sm font-semibold text-navy-500">{t('3. Online or in chambers')}</p>
                                    <div className="mt-3 flex gap-2">
                                        {([['online', Video, t('Online')], ['in_person', MapPin, t('In person')]] as const).map(([value, Icon, label]) => (
                                            <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={cn('inline-flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium', mode === value ? 'border-navy-900 dark:border-gold-400' : 'border-navy-100 text-navy-600 dark:border-navy-700 dark:text-navy-300')}><Icon className="size-4" />{label}</button>
                                        ))}
                                    </div>
                                    <button type="button" disabled={!time} onClick={request} className="mt-6 h-11 w-full rounded-lg bg-navy-900 font-medium text-white transition-opacity disabled:opacity-40 dark:bg-gold-500 dark:text-navy-950">{t('Request consultation')}</button>
                                </motion.div>
                            ) : (
                                <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease }} className="py-4 text-center">
                                    <motion.span className={cn('mx-auto flex size-16 items-center justify-center rounded-full', stage === 'confirmed' ? 'bg-verdant-600 text-white' : 'bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200')} animate={{ scale: stage === 'confirmed' ? [1, 1.12, 1] : 1 }} transition={{ duration: 0.4 }}>
                                        {stage === 'confirmed' ? <Check className="size-8" /> : <BellRing className="size-7" />}
                                    </motion.span>
                                    <p className="mt-5 text-xl font-semibold">{stage === 'confirmed' ? t('Consultation confirmed') : t('Request sent to the lawyer')}</p>
                                    <p className="mt-2 text-navy-600 dark:text-navy-300">{fmt(days[day], { weekday: 'long', day: 'numeric', month: 'long' })}, {time && timeLabel(time)}, {mode === 'online' ? t('Online') : t('In person')}</p>
                                    <ul className="mx-auto mt-5 max-w-xs space-y-2 text-start text-sm">
                                        {[t('Email to you and the lawyer'), t('WhatsApp alert, with your consent'), t('Reminder a day before')].map((line, i) => (
                                            <motion.li key={line} initial={{ opacity: 0, x: -6 }} animate={{ opacity: stage === 'confirmed' || i === 0 ? 1 : 0.4, x: 0 }} transition={{ delay: 0.15 * i }} className="flex items-center gap-2"><Check className="size-4 text-verdant-600" />{line}</motion.li>
                                        ))}
                                    </ul>
                                    <button type="button" onClick={() => { setStage('pick'); setTime(null); }} className="mt-6 text-sm font-medium text-navy-700 underline underline-offset-4 dark:text-navy-200">{t('Try again')}</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
