import { motion } from 'framer-motion';
import { BellRing, CalendarCheck, Search, Scale } from 'lucide-react';
import { Reveal } from '@/Components/motion';
import { ease } from '@/lib/motion';
import { useT } from '@/lib/i18n';

/** Four steps from finding a lawyer to following the case; the connecting line draws itself on scroll. */
export function HowItWorks() {
    const t = useT();
    const steps = [
        { icon: Search, title: t('Find a verified lawyer'), body: t('Search by city, court and practice area. Verified means the bar enrollment was checked.') },
        { icon: CalendarCheck, title: t('Book a consultation'), body: t('Pick a free slot, online or in person. The lawyer accepts and you are notified.') },
        { icon: Scale, title: t('Your case is on file'), body: t('Hearings, orders and documents live in one case file your lawyer keeps current.') },
        { icon: BellRing, title: t('Never miss a date'), body: t('Email and WhatsApp reminders a day before each hearing, with your consent.') },
    ];

    return (
        <section className="py-20 lg:py-28" aria-labelledby="hm-how">
            <div className="hm-wrap">
                <Reveal>
                    <h2 id="hm-how" className="text-4xl font-semibold sm:text-5xl">{t('How it works')}</h2>
                </Reveal>
                <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
                    <motion.span
                        aria-hidden
                        className="absolute start-6 top-6 hidden h-px w-[calc(100%-3rem)] origin-left bg-gold-400/60 md:block rtl:origin-right"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, margin: '0px 0px -20% 0px' }}
                        transition={{ duration: 1.1, ease }}
                    />
                    {steps.map((step, i) => (
                        <motion.li
                            key={step.title}
                            className="relative"
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '0px 0px -20% 0px' }}
                            transition={{ duration: 0.45, delay: 0.15 + i * 0.15, ease }}
                        >
                            <span className="relative z-10 flex size-12 items-center justify-center rounded-full bg-navy-900 text-gold-300 ring-8 ring-ivory dark:bg-gold-500 dark:text-navy-950 dark:ring-navy-950">
                                <step.icon className="size-5" aria-hidden />
                            </span>
                            <p className="mt-5 text-sm font-semibold text-gold-700 tabular-nums dark:text-gold-300">{t('Step :n', { n: i + 1 })}</p>
                            <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                            <p className="mt-2 text-navy-600 dark:text-navy-300">{step.body}</p>
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
