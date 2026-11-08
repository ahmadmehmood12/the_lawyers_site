import { Link, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Textarea } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Article = { slug: string; title: string; excerpt: string | null; body: string; language: string; author: string; author_slug: string | null; category: { name: string; slug: string } | null; tags: { name: string; slug: string }[]; published_at: string; updated_at: string };

export default function ArticleShow({ article: a, comments, canonical }: { article: Article; comments: { id: number; body: string; author: string; created_at: string }[]; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ body: '' });
    return (
        <PublicLayout seo={{ title: a.title, description: a.excerpt ?? undefined, canonical, type: 'article', jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, author: { '@type': 'Person', name: a.author }, datePublished: a.published_at, dateModified: a.updated_at, inLanguage: a.language, mainEntityOfPage: canonical } }}>
            <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6" dir={a.language === 'ur' ? 'rtl' : undefined}>
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-navy-500"><Link href={route('articles.index')}>{t('Legal articles')}</Link>{a.category && <> / <Link href={route('articles.index', { category: a.category.slug })}>{a.category.name}</Link></>}</nav>
                <h1 className="text-4xl leading-tight font-semibold">{a.title}</h1>
                <p className="mt-3 text-sm text-navy-500">{a.author_slug ? <Link href={route('lawyers.show', a.author_slug)} className="font-medium underline">{a.author}</Link> : a.author}, {formatDate(a.published_at, locale)}</p>
                <div className="prose-legal mt-8" dangerouslySetInnerHTML={{ __html: a.body }} />
                <Alert tone="info" className="mt-8">{t('This article is general information, not legal advice. Laws change — consult an advocate about your situation.')}</Alert>
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
        </PublicLayout>
    );
}
