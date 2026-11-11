import { router } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';
import { ArticleCard, type ArticleCardData } from '@/Components/domain/ArticleCard';
import { EmptyState, Pagination } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export default function ArticlesIndex({ articles, categories, filters, canonical }: { articles: Paginated<ArticleCardData>; categories: { name: string; slug: string }[]; filters: Record<string, string>; canonical: string }) {
    const t = useT();
    return (
        <PublicLayout seo={{ title: t('Legal articles'), description: t('Plain-language articles on Pakistani law written by advocates.'), canonical }}>
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
                <h1 className="mb-6 text-3xl font-semibold">{t('Legal articles')}</h1>
                <div className="mb-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => router.get(route('articles.index'))} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200', !filters.category && 'bg-navy-900 text-white')}>{t('All')}</button>
                    {categories.map((c) => <button key={c.slug} type="button" onClick={() => router.get(route('articles.index'), { category: c.slug })} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200', filters.category === c.slug && 'bg-navy-900 text-white')}>{c.name}</button>)}
                </div>
                {articles.data.length === 0 ? <EmptyState icon={<Newspaper className="size-5" />} title={t('No articles yet')} /> : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {articles.data.map((a) => <ArticleCard key={a.slug} article={a} />)}
                    </div>
                )}
                <Pagination meta={articles} />
            </div>
        </PublicLayout>
    );
}
