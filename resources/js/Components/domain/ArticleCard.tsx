import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarDays, Eye, Heart, UserRound } from 'lucide-react';
import { Badge, Card } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export type ArticleCardData = {
    slug: string;
    title: string;
    excerpt: string | null;
    author: string;
    category: string | null;
    published_at: string;
    language: string;
    views?: number;
    likes?: number;
};

export function ArticleCard({ article, className }: { article: ArticleCardData; className?: string }) {
    const t = useT();
    const { locale } = useLocale();

    return (
        <Card className={cn('group flex h-full flex-col transition-colors hover:border-navy-300 dark:hover:border-navy-600', className)}>
            <Link href={route('articles.show', article.slug)} className="flex h-full flex-col p-5" dir={article.language === 'ur' ? 'rtl' : undefined}>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-navy-500 dark:text-navy-400">
                    {article.category && <Badge tone="neutral">{article.category}</Badge>}
                    <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{formatDate(article.published_at, locale)}</span>
                    {article.views !== undefined && <span className="inline-flex items-center gap-1" title={t('Views')}><Eye className="size-3.5" aria-hidden /><span className="tabular-nums">{formatNumber(article.views, locale)}</span><span className="sr-only">{t('Views')}</span></span>}
                    {article.likes !== undefined && <span className="inline-flex items-center gap-1" title={t('Likes')}><Heart className="size-3.5" aria-hidden /><span className="tabular-nums">{formatNumber(article.likes, locale)}</span><span className="sr-only">{t('Likes')}</span></span>}
                </div>
                <h2 className="font-serif text-xl font-semibold group-hover:underline">{article.title}</h2>
                {article.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-navy-600 dark:text-navy-300">{article.excerpt}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-navy-500 dark:text-navy-400">
                    <span className="inline-flex min-w-0 items-center gap-1"><UserRound className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{article.author}</span></span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-gold-700 dark:text-gold-300">{t('Read article')}<ArrowUpRight className="size-3.5" aria-hidden /></span>
                </div>
            </Link>
        </Card>
    );
}
