import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion, MotionConfig, useInView } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LinkButton } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';
import { DraftingTyper } from '@/Components/home/DraftingTyper';
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
    articles: { slug: string; title: string; excerpt: string | null; author: string; published_at: string }[];
    plans: Plan[];
    /** Deferred: real platform totals and ranked lawyers (App\Services\Directory\HomepageShowcase). */
    showcase?: { stats: ShowcaseStats; top: TopLawyersData };
    canonical: string;
};

type Capture = { src: string; alt: string; phone?: boolean };

const ease = [0.16, 1, 0.3, 1] as const;

/** A real capture of the product, framed by a hairline. Never a drawn window. */
function Shot({ capture, eager = false, className }: { capture: Capture; eager?: boolean; className?: string }) {
    return (
        <figure className={cn('hm-shot', capture.phone && 'mx-auto max-w-[300px] rounded-[22px]', className)} data-kind="product">
            <img src={capture.src} alt={capture.alt} width={capture.phone ? 390 : 1440} height={capture.phone ? 844 : 900} loading={eager ? 'eager' : 'lazy'} decoding="async" />
        </figure>
    );
}

export default function Home({ specializations, cities, articles, plans, showcase, canonical }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [query, setQuery] = useState({ search: '', city: '', specialization: '' });

    return (
        <PublicLayout
            seo={{
                title: t('Find a lawyer in Pakistan, court diary for advocates'),
                description: t('Search verified advocates by city, court and practice area. Case management, court diary and WhatsApp hearing reminders for lawyers and law firms in Pakistan.'),
                canonical,
                jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Wakeel Diary', url: canonical, potentialAction: { '@type': 'SearchAction', target: `${route('lawyers.index')}?search={query}`, 'query-input': 'required name=query' } },
            }}
        >
            <MotionConfig reducedMotion="user">
                <div className="hm">
                    <Hero />
                    <StatsStrip stats={showcase?.stats} />
                    <HearingRun />
                    <CaseFile />
                    <Desks />
                    <Paperwork />
                    <TopLawyers data={showcase?.top} />
                    <Plans plans={plans} />
                    <Questions />

                    <section className="border-t border-navy-100 py-20 lg:py-40 dark:border-navy-800" aria-labelledby="hm-find">
                        <div className="hm-wrap grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                            <div>
                                <h2 id="hm-find" className="text-4xl font-semibold sm:text-5xl">{t('Looking for a lawyer?')}</h2>
                                <p className="mt-4 text-lg text-navy-600 dark:text-navy-300">{t('Search by city and practice area.')}</p>
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
                                        <ul className="mt-3 divide-y divide-navy-100 dark:divide-navy-800">
                                            {articles.map((a) => (
                                                <li key={a.slug}>
                                                    <Link href={route('articles.show', a.slug)} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 hover:text-gold-700 dark:hover:text-gold-300">
                                                        <span className="font-medium">{a.title}</span>
                                                        <span className="text-sm text-navy-500">{formatDate(a.published_at, locale)}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
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
    return (
        <section className="flex items-center overflow-hidden py-12 lg:min-h-[calc(100svh-4rem)] lg:py-16" aria-labelledby="hm-hero">
            <div className="hm-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div className="relative z-10">
                    <h1 id="hm-hero" className="text-[clamp(2.5rem,4.6vw+0.5rem,4.75rem)] leading-[1.04] font-semibold">{t('Every hearing on record. Every date kept.')}</h1>
                    <p className="mt-6 max-w-[34ch] text-lg text-navy-600 sm:text-xl dark:text-navy-300">{t('Court diary and case files for Pakistan’s advocates, in Urdu and English.')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <LinkButton href={route('register', { type: 'lawyer' })} size="lg">{t('Start your diary')}</LinkButton>
                        <LinkButton href={route('lawyers.index')} variant="secondary" size="lg">{t('Find a lawyer')}</LinkButton>
                    </div>
                </div>
                <motion.div className="relative lg:w-[118%]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
                    <Shot eager capture={{ src: '/images/screens/dashboard.webp', alt: t('An advocate’s dashboard with three hearings in court today') }} />
                    <WhatsAppAlert siteName={app.name} />
                </motion.div>
            </div>
        </section>
    );
}

function HearingRun() {
    const t = useT();
    const [active, setActive] = useState(0);
    const steps: { title: string; body: string; capture: Capture }[] = [
        { title: t('On the cause list'), body: t('The diary lists each matter by court and room, with what to bring.'), capture: { src: '/images/screens/diary-day.webp', alt: t('Court diary, day view') } },
        { title: t('Order recorded at the bench'), body: t('Record the order and the next date from your phone before leaving court.'), capture: { src: '/images/screens/outcome-phone.webp', alt: t('Recording proceedings on a phone'), phone: true } },
        { title: t('History that is never overwritten'), body: t('Each hearing joins the case timeline. A correction keeps the original.'), capture: { src: '/images/screens/case-timeline.webp', alt: t('Case timeline with hearings, orders and receipts') } },
        { title: t('The client knows the next date'), body: t('Clients see progress in their portal, with WhatsApp reminders if they agree.'), capture: { src: '/images/screens/portal-case-phone.webp', alt: t('Client portal on a phone'), phone: true } },
    ];

    return (
        <section className="border-t border-navy-100 bg-white py-20 lg:py-28 dark:border-navy-800 dark:bg-navy-900/40" aria-labelledby="hm-run">
            <div className="hm-wrap">
                <h2 id="hm-run" className="max-w-[18ch] text-4xl font-semibold sm:text-5xl">{t('One hearing, start to finish')}</h2>
                <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <ol>
                        {steps.map((step, index) => (
                            <RunStep key={step.title} index={index} active={active === index} onEnter={setActive} title={step.title} body={step.body} capture={step.capture} />
                        ))}
                    </ol>
                    <div className="hidden lg:block">
                        <div className="hm-sticky hm-panel flex min-h-[560px] items-center justify-center p-8">
                            <AnimatePresence mode="wait">
                                <motion.div key={active} className="w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease }}>
                                    <Shot capture={steps[active].capture} className={steps[active].capture.phone ? 'max-w-[280px]' : undefined} />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function RunStep({ index, active, onEnter, title, body, capture }: { index: number; active: boolean; onEnter: (index: number) => void; title: string; body: string; capture: Capture }) {
    const ref = useRef<HTMLLIElement>(null);
    const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });
    useEffect(() => {
        if (inView) {
            onEnter(index);
        }
    }, [inView, index, onEnter]);

    return (
        <li ref={ref} className="flex flex-col justify-center border-s-2 ps-6 transition-colors duration-300 lg:min-h-[62vh]" style={{ borderColor: active ? 'var(--hm-accent)' : 'var(--hm-rule)' }}>
            <p className="text-sm font-medium text-navy-500 tabular-nums dark:text-navy-300"><span className="ltr-nums">{index + 1} / 4</span></p>
            <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h3>
            <p className="mt-3 max-w-[40ch] text-lg text-navy-600 dark:text-navy-300">{body}</p>
            <div className="hm-panel mt-6 mb-12 p-4 lg:hidden">
                <Shot capture={capture} />
            </div>
        </li>
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
                <Reveal><Shot capture={{ src: '/images/screens/case-overview.webp', alt: t('A bail case file with parties, court and next hearing') }} /></Reveal>
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

function Desks() {
    const t = useT();
    const desks: { key: string; label: string; body: string; capture: Capture }[] = [
        { key: 'advocate', label: t('Advocate'), body: t('Cause lists by day, week or month, printable for the bar room.'), capture: { src: '/images/screens/diary-week.webp', alt: t('Court diary, week view') } },
        { key: 'firm', label: t('Law firm'), body: t('Reports on caseload, hearings and fees across every lawyer.'), capture: { src: '/images/screens/analytics.webp', alt: t('Practice analytics') } },
        { key: 'client', label: t('Client'), body: t('Progress, documents and messages, without your internal notes.'), capture: { src: '/images/screens/portal-case.webp', alt: t('Client portal, case page') } },
        { key: 'admin', label: t('Platform team'), body: t('Enrollment documents checked before anyone is shown as verified.'), capture: { src: '/images/screens/admin-verifications.webp', alt: t('Lawyer verification queue') } },
    ];
    const [current, setCurrent] = useState(desks[0].key);
    const desk = desks.find((d) => d.key === current) ?? desks[0];

    return (
        <section className="border-t border-navy-100 bg-white py-20 lg:py-28 dark:border-navy-800 dark:bg-navy-900/40" aria-labelledby="hm-desks">
            <div className="hm-wrap">
                <h2 id="hm-desks" className="text-4xl font-semibold sm:text-5xl">{t('One record, four desks')}</h2>
                <div role="tablist" aria-label={t('Who uses it')} className="mt-8 flex gap-6 overflow-x-auto border-b border-navy-100 dark:border-navy-800">
                    {desks.map((d) => (
                        <button
                            key={d.key}
                            type="button"
                            role="tab"
                            id={`hm-tab-${d.key}`}
                            aria-selected={current === d.key}
                            aria-controls="hm-desk-panel"
                            onClick={() => setCurrent(d.key)}
                            className="hm-tab shrink-0 py-3 text-base font-medium"
                        >
                            {d.label}
                            {current === d.key && <motion.span layoutId="hm-tab-mark" className="hm-tab-mark" transition={{ duration: 0.3, ease }} />}
                        </button>
                    ))}
                </div>
                <div id="hm-desk-panel" role="tabpanel" aria-labelledby={`hm-tab-${desk.key}`} className="mt-8">
                    <p className="max-w-[48ch] text-lg text-navy-600 dark:text-navy-300">{desk.body}</p>
                    <AnimatePresence mode="wait">
                        <motion.div key={desk.key} className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                            <Shot capture={desk.capture} />
                        </motion.div>
                    </AnimatePresence>
                </div>
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
        <section className="py-20 lg:py-28" aria-labelledby="hm-paper">
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
                </Reveal>
                <div className="relative pb-6 lg:pb-0">
                    <Reveal><Shot capture={{ src: '/images/screens/draft-editor.webp', alt: t('A post-arrest bail application in the drafting editor') }} /></Reveal>
                    <div className="relative mx-auto -mt-10 w-[min(22rem,90%)] lg:absolute lg:-bottom-8 lg:end-[-1rem] lg:mt-0">
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

function Questions() {
    const t = useT();
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const items = [
        [t('What does verified mean?'), t('Our team checked their bar enrollment. It is not a rating.')],
        [t('Do clients get WhatsApp messages unasked?'), t('No. Reminders go only to clients who consented.')],
        [t('Who can read my case notes?'), t('Your chambers only. Clients never see internal notes.')],
        [t('Does it file anything in court?'), t('Never. You check, sign and file every draft yourself.')],
    ];
    return (
        <section className="py-20 lg:py-40" aria-labelledby="hm-faq">
            <div className="hm-wrap grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <h2 id="hm-faq" className="text-4xl font-semibold sm:text-5xl">{t('Questions advocates ask')}</h2>
                <div className="divide-y divide-navy-100 border-y border-navy-100 dark:divide-navy-800 dark:border-navy-800">
                    {items.map(([question, answer]) => (
                        <details key={question} className="hm-faq group" onToggle={(e) => setOpen((current) => ({ ...current, [question]: e.currentTarget.open }))}>
                            <summary className="flex items-center justify-between gap-6 py-5 text-lg font-medium hover:text-gold-700 dark:hover:text-gold-300">
                                {question}
                                <Plus className="hm-plus size-5 shrink-0 text-navy-400" aria-hidden />
                            </summary>
                            {open[question] && <p className="max-w-[60ch] pb-5 text-navy-600 dark:text-navy-300">{answer}</p>}
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
