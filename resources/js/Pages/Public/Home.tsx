import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { ArticleCard, type ArticleCardData } from '@/Components/domain/ArticleCard';
import { LinkButton } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';
import { BookingJourney } from '@/Components/home/BookingJourney';
import { CaseDemo } from '@/Components/home/CaseDemo';
import { CourtCalendarStrip } from '@/Components/home/CourtCalendarStrip';
import type { CourtHoliday } from '@/Components/domain/CourtHolidays';
import { DraftDemo } from '@/Components/home/DraftDemo';
import { HearingPhone, PHONE_STAGES, stageProgress, useProgressState } from '@/Components/home/HearingPhone';
import { HeroDemo } from '@/Components/home/HeroDemo';
import { ScalesOfJustice } from '@/Components/home/ScalesOfJustice';
import { CitationStream } from '@/Components/home/CitationStream';
import { DraftingTyper } from '@/Components/home/DraftingTyper';
import { HowItWorks } from '@/Components/home/HowItWorks';
import { LegalReferences } from '@/Components/home/LegalReferences';
import { type TeamGroup, TeamSection } from '@/Components/home/TeamSection';
import { type TestimonialItem, Testimonials } from '@/Components/home/Testimonials';
import { VideoTestimonials } from '@/Components/home/VideoTestimonials';
import { Reveal } from '@/Components/home/Reveal';
import { type ShowcaseStats, StatsStrip } from '@/Components/home/StatsStrip';
import { TopLawyers, type TopLawyersData } from '@/Components/home/TopLawyers';
import { WhatsAppAlert } from '@/Components/home/WhatsAppAlert';
import type { SharedProps } from '@/types';
import '../../../css/home.css';

type Plan = { slug: string; name: string; audience: string; description: string | null; price_monthly: number; price_yearly: number; trial_days: number };
type Props = {
    specializations: { slug: string; name: string; count: number }[];
    cities: SelectOption[];
    articles: ArticleCardData[];
    plans: Plan[];
    /** Deferred: real platform totals and ranked lawyers (App\Services\Directory\HomepageShowcase). */
    showcase?: { stats: ShowcaseStats; top: TopLawyersData; testimonials: TestimonialItem[]; videos: TestimonialItem[]; team: TeamGroup[] };
    faqs: { id: number; question: string; answer: string }[];
    courtHolidays: CourtHoliday[];
    canonical: string;
};

const ease = [0.16, 1, 0.3, 1] as const;

export default function Home({ specializations, cities, articles, plans, showcase, faqs, courtHolidays, canonical }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [query, setQuery] = useState({ search: '', city: '', specialization: '' });
    const siteName = usePage<SharedProps>().props.app.name;

    return (
        <PublicLayout
            seo={{
                title: t('Find a lawyer in Pakistan, court diary for advocates'),
                description: t('Search verified advocates by city, court and practice area. Case management, court diary and WhatsApp hearing reminders for lawyers and law firms in Pakistan.'),
                canonical,
                jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: canonical, potentialAction: { '@type': 'SearchAction', target: `${route('lawyers.index')}?search={query}`, 'query-input': 'required name=query' } },
            }}
        >
            <MotionConfig reducedMotion="user">
                <div className="hm">
                    <Hero />
                    <StatsStrip stats={showcase?.stats} />
                    <HowItWorks />
                    <HearingRun />
                    <CaseFile />
                    <CitationStream />
                    <Paperwork />
                    <TopLawyers data={showcase?.top} />
                    <BookingJourney />
                    <Testimonials items={showcase?.testimonials} />
                    <VideoTestimonials items={showcase?.videos} />
                    <TeamSection groups={showcase?.team} />
                    <CourtCalendarStrip holidays={courtHolidays} />
                    <Plans plans={plans} />
                    <Questions faqs={faqs} />

                    <section className="border-t border-navy-100 py-20 lg:py-40 dark:border-navy-800" aria-labelledby="hm-find">
                        <div className="hm-wrap grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                            <div>
                                <h2 id="hm-find" className="text-4xl font-semibold sm:text-5xl">{t('Looking for a lawyer?')}</h2>
                                <p className="mt-4 text-lg text-navy-600 dark:text-navy-300">{t('Search by city and practice area.')}</p>
                                <ScalesOfJustice className="mx-auto mt-10 hidden max-w-md lg:sticky lg:top-28 lg:block" />
                            </div>
                            <div>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); router.get(route('lawyers.index'), Object.fromEntries(Object.entries(query).filter(([, v]) => v))); }}
                                    className="grid gap-2 rounded-xl border border-navy-100 bg-white p-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] dark:border-navy-800 dark:bg-navy-900"
                                >
                                    <input value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value })} placeholder={t('Name or keyword')} className={controlClasses(false, 'h-11')} aria-label={t('Search')} />
                                    <select value={query.city} onChange={(e) => setQuery({ ...query, city: e.target.value })} className={controlClasses(false, 'h-11')} aria-label={t('City')}>
                                        <option value="">{t('Any city')}</option>
                                        {cities.map((c) => <option key={c.value} value={String(c.slug)}>{c.label}</option>)}
                                    </select>
                                    <select value={query.specialization} onChange={(e) => setQuery({ ...query, specialization: e.target.value })} className={controlClasses(false, 'h-11')} aria-label={t('Practice area')}>
                                        <option value="">{t('Any practice area')}</option>
                                        {specializations.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                                    </select>
                                    <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 font-semibold text-white hover:bg-navy-800 active:bg-navy-950 disabled:opacity-50 dark:bg-gold-400 dark:text-navy-950 dark:hover:bg-gold-300">
                                        <Search className="size-4" aria-hidden />
                                        {t('Search')}
                                    </button>
                                </form>
                                <ul className="mt-6 flex flex-wrap gap-2">
                                    {specializations.map((s) => (
                                        <li key={s.slug}>
                                            <Link href={route('lawyers.index', { specialization: s.slug })} className="inline-flex rounded-full border border-navy-200 px-3 py-1.5 text-sm text-navy-700 hover:border-gold-500 hover:text-navy-950 dark:border-navy-700 dark:text-navy-200 dark:hover:text-white">
                                                {s.name}
                                            </Link>
                                        </li>
                                    ))}
                                    <li>
                                        <Link href={route('specializations.index')} className="inline-flex px-3 py-1.5 text-sm font-medium text-gold-700 underline-offset-4 hover:underline dark:text-gold-300">
                                            {t('All practice areas')}
                                        </Link>
                                    </li>
                                </ul>
                                {articles.length > 0 && (
                                    <div className="mt-10 border-t border-navy-100 pt-6 dark:border-navy-800">
                                        <h3 className="text-lg font-semibold">{t('From the legal library')}</h3>
                                        <div className="mt-3 grid gap-3">
                                            {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </MotionConfig>
        </PublicLayout>
    );
}

function Hero() {
    const t = useT();
    const { app } = usePage<SharedProps>().props;
    const ref = useRef<HTMLElement>(null);
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    const textY = useTransform(scrollYProgress, [0, 1], [0, -90]);
    const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);
    const shotY = useTransform(scrollYProgress, [0, 1], [0, 140]);
    const alertY = useTransform(scrollYProgress, [0, 1], [0, -70]);
    const farY = useTransform(scrollYProgress, [0, 1], [0, 220]);
    const nearY = useTransform(scrollYProgress, [0, 1], [0, -160]);
    const depth = (style: Record<string, unknown>) => (reduce ? undefined : style);

    return (
        <section ref={ref} className="relative flex items-center overflow-hidden py-12 lg:min-h-[calc(100svh-4rem)] lg:py-16" aria-labelledby="hm-hero">
            <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
                <motion.span style={depth({ y: farY })} className="ltr-nums absolute -top-6 end-[4%] font-serif text-[clamp(8rem,18vw,16rem)] leading-none font-semibold text-navy-900/[0.04] dark:text-white/[0.04]">302</motion.span>
                <motion.span style={depth({ y: nearY })} className="ltr-nums absolute bottom-[3%] start-[36%] hidden font-serif text-[clamp(6rem,12vw,11rem)] leading-none font-semibold text-gold-500/[0.07] lg:block">§ 497</motion.span>
                <motion.span style={depth({ y: farY })} className="ltr-nums absolute top-[38%] start-[44%] hidden font-serif text-[clamp(5rem,9vw,8rem)] leading-none font-semibold text-navy-900/[0.035] lg:block dark:text-white/[0.035]">324</motion.span>
            </div>
            <div className="hm-wrap relative grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <motion.div className="relative z-10" style={depth({ y: textY, opacity: textOpacity })}>
                    <h1 id="hm-hero" className="text-[clamp(2.5rem,4.6vw+0.5rem,4.75rem)] leading-[1.04] font-semibold">{t('Every hearing on record. Every date kept.')}</h1>
                    <p className="mt-6 max-w-[34ch] text-lg text-navy-600 sm:text-xl dark:text-navy-300">{t('Court diary and case files for Pakistan’s advocates, in Urdu and English.')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <LinkButton href={route('register', { type: 'lawyer' })} size="lg">{t('Start your diary')}</LinkButton>
                        <LinkButton href={route('lawyers.index')} variant="secondary" size="lg">{t('Find a lawyer')}</LinkButton>
                    </div>
                </motion.div>
                <motion.div className="relative" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
                    <motion.div style={depth({ y: shotY })}>
                        <HeroDemo className="h-[28rem] sm:h-[32rem] lg:h-[35rem]" />
                    </motion.div>
                    <motion.div style={depth({ y: alertY })} className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
                        <WhatsAppAlert siteName={app.name} />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/**
 * Scroll story: the section is tall and the phone stays pinned; scroll position drives HearingPhone,
 * so scrolling down plays the next step and scrolling up rewinds it.
 */
function HearingRun() {
    const t = useT();
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
    const p = useProgressState(scrollYProgress);
    const steps: { title: string; body: string; range: [number, number] }[] = [
        { title: t('On the cause list'), body: t('The diary lists each matter by court and room, with what to bring.'), range: [0, PHONE_STAGES.list[1]] },
        { title: t('Order recorded at the bench'), body: t('Record the order and the next date from your phone before leaving court.'), range: [PHONE_STAGES.order[0], PHONE_STAGES.save[1]] },
        { title: t('History that is never overwritten'), body: t('Each hearing joins the case timeline. A correction keeps the original.'), range: [PHONE_STAGES.history[0], PHONE_STAGES.history[1]] },
        { title: t('The client knows the next date'), body: t('Clients get the next date on WhatsApp in English and Urdu, if they agree.'), range: [PHONE_STAGES.lock[0], 1] },
    ];
    const active = Math.max(0, steps.findIndex((step) => p <= step.range[1]));

    return (
        <section ref={ref} className="relative h-[480vh] border-t border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900/40" aria-labelledby="hm-run">
            <div className="sticky top-16 flex h-[calc(100svh-4rem)] items-center overflow-hidden">
                <div className="hm-wrap grid w-full items-center gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
                    <div>
                        <h2 id="hm-run" className="max-w-[18ch] text-3xl font-semibold sm:text-5xl">{t('One hearing, start to finish')}</h2>
                        <ol className="mt-10 hidden space-y-6 lg:block">
                            {steps.map((step, index) => (
                                <li key={step.title} className={cn('relative ps-6 transition-opacity duration-300', index === active ? 'opacity-100' : 'opacity-40')}>
                                    <span className="absolute inset-y-0 start-0 w-0.5 rounded-full" style={{ background: 'var(--hm-rule)' }} />
                                    <motion.span className="absolute start-0 top-0 w-0.5 rounded-full" style={{ background: 'var(--hm-accent)', height: `${stageProgress(p, step.range) * 100}%` }} />
                                    <p className="text-sm font-medium text-navy-500 tabular-nums dark:text-navy-300"><span className="ltr-nums">{index + 1} / 4</span></p>
                                    <h3 className="mt-1 text-2xl font-semibold">{step.title}</h3>
                                    <p className="mt-2 max-w-[40ch] text-lg text-navy-600 dark:text-navy-300">{step.body}</p>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-3 lg:hidden">
                            <div className="mb-2 flex gap-1.5">
                                {steps.map((step) => <span key={step.title} className="h-1 flex-1 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800"><span className="block h-full bg-gold-500" style={{ width: `${stageProgress(p, step.range) * 100}%` }} /></span>)}
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                    <p className="font-semibold">{active + 1}. {steps[active].title}</p>
                                    <p className="text-sm text-navy-600 dark:text-navy-300">{steps[active].body}</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="flex justify-center pt-8">
                        <HearingPhone progress={scrollYProgress} className="h-[min(54svh,560px)] lg:h-[min(74svh,760px)]" />
                    </div>
                </div>
            </div>
        </section>
    );
}

function CaseFile() {
    const t = useT();
    const rows = [
        [t('Parties, FIR and sections'), t('Petitioners, respondents and the offences charged.')],
        [t('Courts and judges'), t('The bench, the room and the judge before whom it is fixed.')],
        [t('Orders and judgments'), t('Every order dated, with the next step it set.')],
        [t('Tasks, fees and expenses'), t('Who does what before the next date, and what it cost.')],
    ];
    return (
        <section className="py-20 lg:py-28" aria-labelledby="hm-file">
            <div className="hm-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <Reveal><CaseDemo /></Reveal>
                <Reveal delay={0.1}>
                    <h2 id="hm-file" className="text-4xl font-semibold sm:text-5xl">{t('The file holds the whole matter')}</h2>
                    <dl className="mt-8 divide-y divide-navy-100 border-y border-navy-100 dark:divide-navy-800 dark:border-navy-800">
                        {rows.map(([term, detail]) => (
                            <div key={term} className="py-4">
                                <dt className="font-semibold">{term}</dt>
                                <dd className="mt-1 text-navy-600 dark:text-navy-300">{detail}</dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>
            </div>
        </section>
    );
}

function Paperwork() {
    const t = useT();
    const rows = [
        [t('Legal drafting'), t('Bail applications, suits and notices from the case, in PDF and Word. Never filed for you.')],
        [t('Document vault'), t('Private, versioned files, shared with the client only when you choose.')],
        [t('Fees and receipts'), t('Invoices, part payments and numbered receipts.')],
    ];
    return (
        <section className="pt-20 pb-20 lg:pt-28 lg:pb-52" aria-labelledby="hm-paper">
            <div className="hm-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <Reveal>
                    <h2 id="hm-paper" className="text-4xl font-semibold sm:text-5xl">{t('Drafts, documents and receipts')}</h2>
                    <dl className="mt-8 space-y-6">
                        {rows.map(([term, detail]) => (
                            <div key={term}>
                                <dt className="text-lg font-semibold">{term}</dt>
                                <dd className="mt-1 text-navy-600 dark:text-navy-300">{detail}</dd>
                            </div>
                        ))}
                    </dl>
                    <LegalReferences />
                </Reveal>
                <div className="relative pb-6 lg:pb-0">
                    <Reveal><DraftDemo /></Reveal>
                    <div className="relative mx-auto -mt-10 w-[min(22rem,90%)] lg:absolute lg:-bottom-44 lg:end-[-1rem] lg:mt-0">
                        <DraftingTyper />
                    </div>
                </div>
            </div>
        </section>
    );
}

function Plans({ plans }: { plans: Plan[] }) {
    const t = useT();
    const { locale } = useLocale();
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
    if (plans.length === 0) {
        return null;
    }

    return (
        <section className="border-t border-navy-100 bg-white py-20 lg:pt-28 lg:pb-40 dark:border-navy-800 dark:bg-navy-900/40" aria-labelledby="hm-plans">
            <div className="hm-wrap">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <h2 id="hm-plans" className="text-4xl font-semibold sm:text-5xl">{t('Plans in rupees')}</h2>
                    <div className="inline-flex rounded-lg border border-navy-200 p-1 dark:border-navy-700" role="group" aria-label={t('Billing period')}>
                        {(['monthly', 'yearly'] as const).map((period) => (
                            <button
                                key={period}
                                type="button"
                                aria-pressed={cycle === period}
                                onClick={() => setCycle(period)}
                                className={cn('min-h-11 rounded-md px-5 text-sm font-medium transition-colors', cycle === period ? 'bg-navy-900 text-white dark:bg-gold-400 dark:text-navy-950' : 'text-navy-600 hover:text-navy-900 dark:text-navy-300 dark:hover:text-white')}
                            >
                                {period === 'monthly' ? t('Monthly') : t('Yearly')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative mt-10">
                    <table className="w-full text-start">
                        <thead>
                            <tr className="border-b border-navy-200 text-sm text-navy-600 dark:border-navy-700 dark:text-navy-300">
                                <th scope="col" className="py-3 pe-4 text-start font-medium">{t('Plan')}</th>
                                <th scope="col" className="hidden py-3 pe-4 text-start font-medium md:table-cell">{t('Who it suits')}</th>
                                <th scope="col" className="py-3 pe-4 text-end font-medium">{cycle === 'monthly' ? t('Per month') : t('Per year')}</th>
                                <th scope="col" className="py-3"><span className="sr-only">{t('Start')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                            {plans.map((plan) => {
                                const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                                return (
                                    <tr key={plan.slug}>
                                        <th scope="row" className="py-5 pe-4 text-start font-serif text-lg font-semibold sm:text-xl">{plan.name}<span className="mt-1 block font-sans text-sm font-normal text-navy-600 md:hidden dark:text-navy-300">{plan.description}</span></th>
                                        <td className="hidden py-5 pe-4 text-navy-600 md:table-cell dark:text-navy-300">{plan.description}</td>
                                        <td className="ltr-nums py-5 pe-4 text-end text-lg font-semibold whitespace-nowrap tabular-nums sm:text-xl">{price > 0 ? formatMoney(price, locale) : t('Free')}</td>
                                        <td className="py-5 text-end">
                                            <LinkButton href={route('register', { type: plan.audience === 'firm' ? 'firm' : 'lawyer' })} variant="secondary" size="sm">
                                                {t('Start')}
                                            </LinkButton>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-6 text-sm text-navy-500">
                    <Link href={route('pricing')} className="font-medium text-navy-800 underline underline-offset-4 hover:text-gold-700 dark:text-navy-100">{t('Compare what each plan includes')}</Link>
                </p>
            </div>
        </section>
    );
}

function Questions({ faqs }: { faqs: { id: number; question: string; answer: string }[] }) {
    const t = useT();
    const [open, setOpen] = useState<Record<number, boolean>>({});
    if (faqs.length === 0) return null;
    return (
        <section className="py-20 lg:py-40" aria-labelledby="hm-faq">
            <div className="hm-wrap grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div>
                    <h2 id="hm-faq" className="text-4xl font-semibold sm:text-5xl">{t('Questions advocates ask')}</h2>
                    <Link href={route('faqs')} className="mt-6 inline-block text-sm font-medium text-navy-800 underline underline-offset-4 hover:text-gold-700 dark:text-navy-100 dark:hover:text-gold-300">{t('See all questions')}</Link>
                </div>
                <div className="divide-y divide-navy-100 border-y border-navy-100 dark:divide-navy-800 dark:border-navy-800">
                    {faqs.map((faq) => (
                        <details key={faq.id} className="hm-faq group" onToggle={(e) => setOpen((current) => ({ ...current, [faq.id]: e.currentTarget.open }))}>
                            <summary className="flex items-center justify-between gap-6 py-5 text-lg font-medium hover:text-gold-700 dark:hover:text-gold-300">
                                {faq.question}
                                <Plus className="hm-plus size-5 shrink-0 text-navy-400" aria-hidden />
                            </summary>
                            {open[faq.id] && <p className="max-w-[60ch] whitespace-pre-line pb-5 text-navy-600 dark:text-navy-300">{faq.answer}</p>}
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
