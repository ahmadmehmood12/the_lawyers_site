import { Link } from '@inertiajs/react';
import { Eye, FolderOpen, Heart, Newspaper, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArticleCard, type ArticleCardData } from '@/Components/domain/ArticleCard';
import { Card, CardBody, CardHeader, EmptyState, Pagination } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Taxonomy = { name: string; slug: string; count: number };

type Props = {
    articles: Paginated<ArticleCardData>;
    categories: Taxonomy[];
    tags: Taxonomy[];
    topViewed: ArticleCardData[];
    topLiked: ArticleCardData[];
    filters: Record<string, string>;
    canonical: string;
};

export default function ArticlesIndex({ articles, categories, tags, topViewed, topLiked, filters, canonical }: Props) {
    const t = useT();

    return (
        <PublicLayout seo={{ title: t('Legal articles'), description: t('Plain-language articles on Pakistani law written by advocates.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-semibold">{t('Legal articles')}</h1>
                    <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">{t('Plain-language articles on Pakistani law written by advocates.')}</p>
                </div>

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="min-w-0">
                        <div className="mb-5 flex flex-wrap gap-2 lg:hidden">
                            <Link href={route('articles.index')} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', !filters.category && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>{t('All')}</Link>
                            {categories.map((category) => (
                                <Link key={category.slug} href={route('articles.index', { category: category.slug })} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', filters.category === category.slug && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>
                                    {category.name}
                                </Link>
                            ))}
                        </div>

                        {articles.data.length === 0 ? <EmptyState icon={<Newspaper className="size-5" />} title={t('No articles yet')} /> : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {articles.data.map((article) => <ArticleCard key={article.slug} article={article} />)}
                            </div>
                        )}
                        <Pagination meta={articles} />
                    </div>

                    <aside className="space-y-5 lg:sticky lg:top-24">
                        <SidebarCard title={t('Categories')} icon={<FolderOpen className="size-4" />}>
                            {categories.length === 0 ? <p className="text-sm text-navy-500 dark:text-navy-400">{t('No categories yet')}</p> : (
                                <ul className="space-y-1">
                                    {categories.map((category) => (
                                        <li key={category.slug}>
                                            <Link href={route('articles.index', { category: category.slug })} className={cn('flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition', filters.category === category.slug ? 'bg-navy-900 font-medium text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800')}>
                                                <span className="truncate">{category.name}</span>
                                                <span className={cn('text-xs tabular-nums', filters.category === category.slug ? 'opacity-80' : 'text-navy-400')}>{category.count}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SidebarCard>

                        <SidebarCard title={t('All tags')} icon={<Tags className="size-4" />}>
                            {tags.length === 0 ? <p className="text-sm text-navy-500 dark:text-navy-400">{t('No tags yet')}</p> : (
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag) => (
                                        <Link key={tag.slug} href={route('articles.index', { tag: tag.slug })} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition', filters.tag === tag.slug ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950 dark:ring-gold-500' : 'text-navy-600 ring-navy-200 hover:bg-navy-50 dark:text-navy-300 dark:ring-navy-700 dark:hover:bg-navy-800')}>
                                            <span>{tag.name}</span>
                                            <span className="opacity-60">{tag.count}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </SidebarCard>

                        <TopArticles title={t('Top viewed')} icon={<Eye className="size-4" />} articles={topViewed} metric="views" emptyLabel={t('No articles yet')} />
                        <TopArticles title={t('Top liked')} icon={<Heart className="size-4" />} articles={topLiked} metric="likes" emptyLabel={t('No articles yet')} />
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}

function SidebarCard({ title, icon, children }: { title: ReactNode; icon: ReactNode; children: ReactNode }) {
    return (
        <Card>
            <CardHeader title={<span className="flex items-center gap-2">{icon}{title}</span>} />
            <CardBody>{children}</CardBody>
        </Card>
    );
}

function TopArticles({ title, icon, articles, metric, emptyLabel }: { title: string; icon: ReactNode; articles: ArticleCardData[]; metric: 'views' | 'likes'; emptyLabel: string }) {
    return (
        <SidebarCard title={title} icon={icon}>
            {articles.length === 0 ? <p className="text-sm text-navy-500 dark:text-navy-400">{emptyLabel}</p> : (
                <ol className="space-y-3">
                    {articles.map((article, index) => (
                        <li key={article.slug} className="flex gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-600 dark:bg-navy-800 dark:text-navy-300">{index + 1}</span>
                            <div className="min-w-0">
                                <Link href={route('articles.show', article.slug)} className="line-clamp-2 text-sm font-medium leading-snug text-navy-800 hover:underline dark:text-navy-100">
                                    {article.title}
                                </Link>
                                <span className="mt-0.5 flex items-center gap-1 text-xs text-navy-400">
                                    {metric === 'views' ? <Eye className="size-3" /> : <Heart className="size-3" />}
                                    {article[metric]}
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </SidebarCard>
    );
}
