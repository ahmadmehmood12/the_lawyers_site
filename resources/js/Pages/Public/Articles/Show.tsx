import { Link, router, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CalendarDays, Eye, FolderOpen, Heart, MessageSquare, Tag, UserRound } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { ArticleCardData } from '@/Components/domain/ArticleCard';
import { Alert, Button, Textarea } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Article = {
    slug: string; title: string; excerpt: string | null; body: string; language: string; author: string; author_slug: string | null;
    category: { name: string; slug: string } | null; tags: { name: string; slug: string }[]; published_at: string; updated_at: string;
    views: number; likes: number; liked: boolean;
};
type Props = {
    article: Article;
    related: ArticleCardData[];
    categories: { name: string; slug: string; count: number }[];
    comments: { id: number; body: string; author: string; created_at: string }[];
    canonical: string;
};

/** Public article: categories on the left, the article in the middle, related articles on the right. */
export default function ArticleShow({ article: a, related, categories, comments, canonical }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ body: '' });
    const [like, setLike] = useState({ liked: a.liked, count: a.likes });

    useEffect(() => setLike({ liked: a.liked, count: a.likes }), [a.liked, a.likes]);

    function toggleLike() {
        if (!auth.user) {
            router.visit(route('login'));
            return;
        }
        const previous = like;
        setLike({ liked: !like.liked, count: Math.max(0, like.count + (like.liked ? -1 : 1)) });
        router.post(route('articles.like', a.slug), {}, { preserveScroll: true, preserveState: true, onError: () => setLike(previous) });
    }

    const likeButton = (
        <motion.button type="button" onClick={toggleLike} whileTap={{ scale: 0.92 }} aria-pressed={like.liked}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition',
                like.liked ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30' : 'text-navy-700 ring-navy-200 hover:bg-navy-50 dark:text-navy-200 dark:ring-navy-700 dark:hover:bg-navy-800')}>
            <motion.span key={String(like.liked)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
                <Heart className={cn('size-4', like.liked && 'fill-current')} aria-hidden />
            </motion.span>
            <span className="tabular-nums">{formatNumber(like.count, locale)}</span>
            <span>{like.liked ? t('Liked') : t('Like')}</span>
        </motion.button>
    );

    return (
        <PublicLayout seo={{ title: a.title, description: a.excerpt ?? undefined, canonical, type: 'article', jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, author: { '@type': 'Person', name: a.author }, datePublished: a.published_at, dateModified: a.updated_at, inLanguage: a.language, mainEntityOfPage: canonical } }}>
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
                {/* Left: categories and tags */}
                <aside className="order-2 space-y-6 lg:order-1">
                    <div className="lg:sticky lg:top-24 space-y-6">
                        <SideBlock title={t('Categories')} icon={<FolderOpen className="size-4" />}>
                            <ul className="space-y-0.5 text-sm">
                                {categories.map((c) => (
                                    <li key={c.slug}>
                                        <Link href={route('articles.index', { category: c.slug })} className={cn('flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-navy-50 dark:hover:bg-navy-800', a.category?.slug === c.slug && 'bg-navy-50 font-medium text-navy-900 dark:bg-navy-800 dark:text-white')}>
                                            <span className="truncate">{c.name}</span>
                                            <span className="ms-2 text-xs tabular-nums text-navy-400">{formatNumber(c.count, locale)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </SideBlock>
                        {a.tags.length > 0 && (
                            <SideBlock title={t('Tags')} icon={<Tag className="size-4" />}>
                                <div className="flex flex-wrap gap-1.5">
                                    {a.tags.map((tag) => <Link key={tag.slug} href={route('articles.index', { tag: tag.slug })} className="rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800">{tag.name}</Link>)}
                                </div>
                            </SideBlock>
                        )}
                    </div>
                </aside>

                {/* Article */}
                <article className="order-1 min-w-0 lg:order-2" dir={a.language === 'ur' ? 'rtl' : undefined}>
                    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-navy-500"><Link href={route('articles.index')}>{t('Legal articles')}</Link>{a.category && <> / <Link href={route('articles.index', { category: a.category.slug })}>{a.category.name}</Link></>}</nav>
                    <h1 className="text-4xl leading-tight font-semibold">{a.title}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-navy-100 pb-4 text-sm text-navy-500 dark:border-navy-800">
                        <span className="inline-flex items-center gap-1.5"><UserRound className="size-4" />{a.author_slug ? <Link href={route('lawyers.show', a.author_slug)} className="font-medium underline">{a.author}</Link> : a.author}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDate(a.published_at, locale)}</span>
                        <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /><span className="tabular-nums">{formatNumber(a.views, locale)}</span> {t('views')}</span>
                        <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-4" /><span className="tabular-nums">{formatNumber(comments.length, locale)}</span> {t('comments')}</span>
                        <span className="ms-auto">{likeButton}</span>
                    </div>
                    <div className="prose-legal mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: a.body }} />
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-navy-50 p-4 dark:bg-navy-900">
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('Found this useful?')}</p>
                        {likeButton}
                    </div>
                    <Alert tone="info" className="mt-6">{t('This article is general information, not legal advice. Laws change — consult an advocate about your situation.')}</Alert>
                    <section className="mt-10">
                        <h2 className="mb-4 text-xl font-semibold">{t('Comments')}</h2>
                        {comments.map((c) => <div key={c.id} className="border-b border-navy-100 py-3 text-sm dark:border-navy-800"><p>{c.body}</p><p className="text-xs text-navy-500">{c.author}, {c.created_at}</p></div>)}
                        {auth.user ? (
                            <form onSubmit={(e) => { e.preventDefault(); form.post(route('articles.comments.store', a.slug), { preserveScroll: true, onSuccess: () => form.reset() }); }} className="mt-4 space-y-2">
                                <Textarea aria-label={t('Comment')} rows={3} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} />
                                <Button type="submit" size="sm" loading={form.processing}>{t('Post comment')}</Button>
                            </form>
                        ) : <p className="mt-4 text-sm"><Link href={route('login')} className="underline">{t('Sign in')}</Link> {t('to comment.')}</p>}
                    </section>
                </article>

                {/* Right: related articles */}
                {related.length > 0 && (
                    <aside className="order-3 lg:col-span-2 xl:col-span-1">
                        <div className="xl:sticky xl:top-24">
                            <SideBlock title={t('Related articles')}>
                                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                    {related.map((r) => (
                                        <li key={r.slug}>
                                            <Link href={route('articles.show', r.slug)} className="group block rounded-lg p-3 ring-1 ring-navy-100 transition hover:-translate-y-0.5 hover:ring-navy-300 dark:ring-navy-800 dark:hover:ring-navy-600" dir={r.language === 'ur' ? 'rtl' : undefined}>
                                                {r.category && <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gold-700 dark:text-gold-300">{r.category}</p>}
                                                <p className="line-clamp-2 font-serif font-semibold group-hover:underline">{r.title}</p>
                                                <div className="mt-2 flex items-center gap-3 text-xs text-navy-500">
                                                    <span>{formatDate(r.published_at, locale)}</span>
                                                    <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{formatNumber(r.views ?? 0, locale)}</span>
                                                    <span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{formatNumber(r.likes ?? 0, locale)}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SideBlock>
                        </div>
                    </aside>
                )}
            </div>
        </PublicLayout>
    );
}

function SideBlock({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-card border border-navy-100 bg-white p-4 dark:border-navy-800 dark:bg-navy-900">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white"><span className="text-gold-600">{icon}</span>{title}</h2>
            {children}
        </section>
    );
}
