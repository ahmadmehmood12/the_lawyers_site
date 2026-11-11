import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, MessageCircleQuestion, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LinkButton } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Faq = { id: number; category: string | null; question: string; answer: string };

/** Public FAQs page (FaqPageController): search, category filter and an accordion. */
export default function Faqs({ faqs, canonical }: { faqs: Faq[]; canonical: string }) {
    const t = useT();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [open, setOpen] = useState<number | null>(faqs[0]?.id ?? null);
    const categories = useMemo(() => Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))) as string[], [faqs]);

    const visible = faqs.filter((f) => (!category || f.category === category)
        && (!query.trim() || `${f.question} ${f.answer}`.toLowerCase().includes(query.trim().toLowerCase())));
    const groups = (category ? [category] : [...categories, null]).map((c) => ({ name: c, items: visible.filter((f) => f.category === c) })).filter((g) => g.items.length > 0);

    const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };

    return (
        <PublicLayout seo={{ title: t('Frequently asked questions'), description: t('Answers about verification, privacy, booking and plans.'), canonical, jsonLd }}>
            <section className="border-b border-navy-100 bg-navy-50/60 dark:border-navy-800 dark:bg-navy-900/40">
                <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6">
                    <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-semibold sm:text-5xl">{t('Frequently asked questions')}</motion.h1>
                    <p className="mx-auto mt-3 max-w-2xl text-lg text-navy-600 dark:text-navy-300">{t('Answers about verification, privacy, booking and plans.')}</p>
                    <div className="relative mx-auto mt-6 max-w-xl">
                        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search questions')} aria-label={t('Search questions')} className={cn(controlClasses, 'ps-9')} />
                    </div>
                    {categories.length > 1 && (
                        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                            {[null, ...categories].map((c) => (
                                <button key={c ?? 'all'} type="button" onClick={() => setCategory(c)}
                                    className={cn('rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset ring-navy-200 transition dark:ring-navy-700', category === c ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'bg-white hover:bg-navy-50 dark:bg-navy-900 dark:hover:bg-navy-800')}>
                                    {c ?? t('All')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                {groups.length === 0 ? (
                    <p className="py-16 text-center text-navy-500">{t('No questions match your search.')}</p>
                ) : groups.map((group) => (
                    <section key={group.name ?? 'general'} className="mb-10">
                        {(groups.length > 1 || group.name) && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold-700 dark:text-gold-300">{group.name ?? t('General')}</h2>}
                        <div className="divide-y divide-navy-100 rounded-card border border-navy-100 bg-white dark:divide-navy-800 dark:border-navy-800 dark:bg-navy-900">
                            {group.items.map((f) => {
                                const isOpen = open === f.id;
                                return (
                                    <div key={f.id}>
                                        <button type="button" onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}
                                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-lg font-medium hover:text-gold-700 dark:hover:text-gold-300">
                                            {f.question}
                                            <ChevronDown className={cn('size-5 shrink-0 text-navy-400 transition-transform', isOpen && 'rotate-180')} aria-hidden />
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                                    <p className="whitespace-pre-line px-5 pb-5 text-navy-600 dark:text-navy-300">{f.answer}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                <div className="mt-6 flex flex-col items-center gap-3 rounded-card bg-navy-900 px-6 py-8 text-center text-white">
                    <MessageCircleQuestion className="size-8 text-gold-400" />
                    <p className="text-xl font-semibold">{t('Still have a question?')}</p>
                    <p className="text-navy-200">{t('Write to us and we will reply as soon as we can.')}</p>
                    <LinkButton href={route('contact')} variant="secondary">{t('Contact us')}</LinkButton>
                </div>
                <p className="mt-6 text-center text-sm"><Link href={route('home')} className="text-navy-600 underline dark:text-navy-300">{t('Back to home')}</Link></p>
            </div>
        </PublicLayout>
    );
}
