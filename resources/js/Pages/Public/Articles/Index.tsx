import { Link, router } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';
import { EmptyState, Pagination } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = { slug: string; title: string; excerpt: string | null; author: string; category: string | null; published_at: string; language: string };

export default function ArticlesIndex({ articles, categories, filters, canonical }: { articles: Paginated<Row>; categories: { name: string; slug: string }[]; filters: Record<string, string>; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <PublicLayout seo={{ title: t('Legal articles'), description: t('Plain-language articles on Pakistani law written by advocates.'), canonical }}>
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
                <h1 className="mb-6 text-3xl font-semibold">{t('Legal articles')}</h1>
                <div className="mb-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => router.get(route('articles.index'))} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200', !filters.category && 'bg-navy-900 text-white')}>{t('All')}</button>
                    {categories.map((c) => <button key={c.slug} type="button" onClick={() => router.get(route('articles.index'), { category: c.slug })} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200', filters.category === c.slug && 'bg-navy-900 text-white')}>{c.name}</button>)}
                </div>
                {articles.data.length === 0 ? <EmptyState icon={<Newspaper className="size-5" />} title={t('No articles yet')} /> : (
                    <div className="divide-y divide-navy-100 dark:divide-navy-800">
                        {articles.data.map((a) => (
                            <article key={a.slug} className="py-5" dir={a.language === 'ur' ? 'rtl' : undefined}>
                                <Link href={route('articles.show', a.slug)} className="font-serif text-xl font-semibold hover:underline">{a.title}</Link>
                                {a.excerpt && <p className="mt-1 text-navy-600 dark:text-navy-300">{a.excerpt}</p>}
                                <p className="mt-2 text-xs text-navy-500">{a.author}{a.category ? `, ${a.category}` : ''}, {formatDate(a.published_at, locale)}</p>
                            </article>
                        ))}
                    </div>
                )}
                <Pagination meta={articles} />
            </div>
        </PublicLayout>
    );
}
