import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Briefcase, Building2, ChevronRight, Lightbulb, Search, ShieldCheck, Sparkles, UserRound, X, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LinkButton } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';
import { guide, type GuideSection, type GuideTopic } from './guide/content';

const audiences: { key: 'all' | GuideSection['audience']; label: string; icon: ReactNode }[] = [
    { key: 'all', label: 'Everything', icon: <BookOpen className="size-4" /> },
    { key: 'start', label: 'Getting started', icon: <Sparkles className="size-4" /> },
    { key: 'lawyer', label: 'Lawyers', icon: <Briefcase className="size-4" /> },
    { key: 'firm', label: 'Law firms', icon: <Building2 className="size-4" /> },
    { key: 'client', label: 'Clients', icon: <UserRound className="size-4" /> },
    { key: 'account', label: 'Account', icon: <ShieldCheck className="size-4" /> },
];

/**
 * User Guide (UserGuideController): every feature for lawyers, law firms and clients, each with a
 * real screenshot in the site's current theme. Numbered markers on the screenshot match the steps.
 */
export default function UserGuide({ canonical }: { canonical: string }) {
    const t = useT();
    const { app } = usePage<SharedProps>().props;
    const theme = app.site_theme === 'white-green' ? 'white-green' : 'navy-gold';
    const [audience, setAudience] = useState<(typeof audiences)[number]['key']>('all');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState<string>(guide[0].topics[0].id);
    const [zoom, setZoom] = useState<GuideTopic | null>(null);

    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();
        return guide
            .filter((s) => audience === 'all' || s.audience === audience)
            .map((s) => ({ ...s, topics: s.topics.filter((topic) => !q || [topic.title, topic.summary, ...(topic.steps ?? []), ...(topic.tips ?? [])].join(' ').toLowerCase().includes(q)) }))
            .filter((s) => s.topics.length > 0);
    }, [audience, query]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (visible) setActive(visible.target.id);
        }, { rootMargin: '-20% 0px -65% 0px' });
        document.querySelectorAll('[data-topic]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [sections]);

    const src = (shot: string) => `/images/guide/${theme}/${shot}.webp`;

    return (
        <PublicLayout seo={{ title: t('User Guide'), description: t('Step by step help for lawyers, law firms and clients, with screenshots of every feature.'), canonical }}>
            <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 text-white dark:border-navy-800">
                <motion.div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gold-500/20 blur-3xl" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 8 }} />
                <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold-200"><BookOpen className="size-4" />{t('User Guide')}</p>
                    <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold sm:text-5xl">{t('How to use :site, step by step', { site: app.name })}</h1>
                    <p className="mt-4 max-w-2xl text-lg text-navy-200">{t('Every feature for lawyers, law firms and clients, with real screenshots. Gold numbers on each picture show where to click or type.')}</p>
                    <div className="relative mt-8 max-w-xl">
                        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search the guide, for example record order')} aria-label={t('Search the guide')} className={cn(controlClasses(false, 'h-12'), 'ps-9 text-navy-900')} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                        {audiences.map((a) => (
                            <button key={a.key} type="button" onClick={() => setAudience(a.key)} className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition', audience === a.key ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white hover:bg-white/20')}>
                                {a.icon}{t(a.label)}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <nav aria-label={t('Guide contents')} className="hidden lg:block">
                    <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pe-2 [scrollbar-width:thin]">
                        {sections.map((section) => (
                            <div key={section.id} className="mb-5">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gold-700 dark:text-gold-300">{t(section.title)}</p>
                                <ul className="space-y-0.5 border-s border-navy-100 dark:border-navy-800">
                                    {section.topics.map((topic) => (
                                        <li key={topic.id}>
                                            <a href={`#${topic.id}`} className={cn('-ms-px block border-s-2 py-1 ps-3 text-sm transition', active === topic.id ? 'border-gold-500 font-medium text-navy-900 dark:text-white' : 'border-transparent text-navy-500 hover:text-navy-800 dark:hover:text-navy-200')}>{t(topic.title)}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="min-w-0 space-y-16">
                    {sections.length === 0 && <p className="py-20 text-center text-navy-500">{t('Nothing matches your search.')}</p>}
                    {sections.map((section) => (
                        <section key={section.id} aria-labelledby={`s-${section.id}`}>
                            <h2 id={`s-${section.id}`} className="font-serif text-3xl font-semibold">{t(section.title)}</h2>
                            <p className="mt-2 max-w-3xl text-lg text-navy-600 dark:text-navy-300">{t(section.intro)}</p>
                            <div className="mt-8 space-y-14">
                                {section.topics.map((topic) => <Topic key={topic.id} topic={topic} src={topic.shot ? src(topic.shot) : null} onZoom={() => setZoom(topic)} />)}
                            </div>
                        </section>
                    ))}

                    <div className="flex flex-col items-start gap-3 rounded-card bg-navy-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xl font-semibold">{t('Still stuck?')}</p>
                            <p className="text-navy-200">{t('Read the questions others ask, or write to us.')}</p>
                        </div>
                        <div className="flex gap-2">
                            <LinkButton href={route('faqs')} variant="secondary">{t('FAQs')}</LinkButton>
                            <LinkButton href={route('contact')}>{t('Contact us')}</LinkButton>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {zoom?.shot && (
                    <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-navy-950/85 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
                        <button type="button" aria-label={t('Close')} className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="size-5" /></button>
                        <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={src(zoom.shot)} alt={t(zoom.title)} className="max-h-[90dvh] w-auto max-w-full rounded-xl shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>
        </PublicLayout>
    );
}

function Topic({ topic, src, onZoom }: { topic: GuideTopic; src: string | null; onZoom: () => void }) {
    const t = useT();
    return (
        <motion.article id={topic.id} data-topic initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.4 }} className="scroll-mt-24">
            <h3 className="flex items-center gap-2 text-2xl font-semibold"><ChevronRight className="size-5 text-gold-500" />{t(topic.title)}</h3>
            <p className="mt-2 max-w-3xl text-navy-600 dark:text-navy-300">{t(topic.summary)}</p>
            {src && (
                <button type="button" onClick={onZoom} className="group relative mt-5 block w-full overflow-hidden rounded-xl border border-navy-100 bg-navy-50 text-start shadow-card dark:border-navy-800 dark:bg-navy-900" aria-label={t('Enlarge screenshot')}>
                    <img src={src} alt={t(topic.title)} loading="lazy" decoding="async" width={1440} height={900} className="w-full transition duration-500 group-hover:scale-[1.01]" />
                    <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy-900/80 px-2.5 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"><ZoomIn className="size-3.5" />{t('Enlarge')}</span>
                </button>
            )}
            {topic.steps && topic.steps.length > 0 && (
                <ol className="mt-5 space-y-3">
                    {topic.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-bold text-navy-950 ring-2 ring-white dark:ring-navy-900">{i + 1}</span>
                            <p className="pt-0.5">{t(step)}</p>
                        </li>
                    ))}
                </ol>
            )}
            {topic.tips && topic.tips.length > 0 && (
                <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50 p-4 dark:border-gold-500/30 dark:bg-gold-500/10">
                    <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gold-700 dark:text-gold-300"><Lightbulb className="size-4" />{t('Good to know')}</p>
                    <ul className="list-disc space-y-1 ps-5 text-sm text-navy-700 dark:text-navy-200">{topic.tips.map((tip) => <li key={tip}>{t(tip)}</li>)}</ul>
                </div>
            )}
            <p className="mt-4"><Link href={`#${topic.id}`} className="text-xs text-navy-400 hover:underline">#{topic.id}</Link></p>
        </motion.article>
    );
}
