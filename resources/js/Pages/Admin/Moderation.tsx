import { router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { Button, Card, ConfirmAction, EmptyState, PageHeader, Pagination, StatusBadge, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export default function Moderation({ tab, articles, reviews, comments }: { tab: string; articles: Paginated<any> | null; reviews: Paginated<any> | null; comments: Paginated<any> | null }) {
    const t = useT();
    const { locale } = useLocale();
    const list = articles ?? reviews ?? comments;
    return (
        <AppLayout title={t('Moderation')} area="admin">
            <PageHeader title={t('Content moderation')} />
            <Tabs className="mb-4" active={tab} tabs={[{ key: 'articles', label: t('Articles'), href: route('admin.articles.index', { tab: 'articles' }) }, { key: 'reviews', label: t('Reviews'), href: route('admin.articles.index', { tab: 'reviews' }) }, { key: 'comments', label: t('Comments'), href: route('admin.articles.index', { tab: 'comments' }) }]} />
            <Card>
                {!list || list.data.length === 0 ? <EmptyState title={t('Nothing to moderate')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {list.data.map((item: any) => (
                            <li key={item.id} className="space-y-2 px-5 py-4 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium">{articles ? item.title : reviews ? `${item.lawyer} ← ${item.author}` : `${item.author} on “${item.article}”`}</p>
                                    <StatusBadge value={item.status} label={item.status_label} />
                                </div>
                                {reviews && <p className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-3.5 ${i < item.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200'}`} />)}</p>}
                                {articles ? <details><summary className="cursor-pointer text-navy-600">{item.excerpt ?? t('Read article')}</summary><div className="prose-legal mt-2 rounded bg-navy-50 p-3 dark:bg-navy-800" dangerouslySetInnerHTML={{ __html: item.body }} /></details> : <p>{item.comment ?? item.body}</p>}
                                <p className="text-xs text-navy-500">{articles && item.author} {formatDateTime(item.updated_at ?? item.created_at, locale)}</p>
                                <div className="flex gap-2">
                                    {articles && (<><Button size="sm" variant="success" onClick={() => router.put(route('admin.articles.moderate', item.id), { status: 'published' }, { preserveScroll: true })}>{t('Publish')}</Button><ConfirmAction href={route('admin.articles.moderate', item.id)} method="put" data={{ status: 'rejected' }} reasonField="reason" title={t('Reject article?')} trigger={(open) => <Button size="sm" variant="ghost" onClick={open}>{t('Reject')}</Button>} /></>)}
                                    {reviews && (<><Button size="sm" variant="success" onClick={() => router.put(route('admin.reviews.moderate', item.id), { status: 'approved' }, { preserveScroll: true })}>{t('Approve')}</Button><Button size="sm" variant="ghost" onClick={() => router.put(route('admin.reviews.moderate', item.id), { status: 'rejected' }, { preserveScroll: true })}>{t('Reject')}</Button></>)}
                                    {comments && (<><Button size="sm" variant="success" onClick={() => router.put(route('admin.comments.moderate', item.id), { status: 'approved' }, { preserveScroll: true })}>{t('Approve')}</Button><Button size="sm" variant="ghost" onClick={() => router.put(route('admin.comments.moderate', item.id), { status: 'rejected' }, { preserveScroll: true })}>{t('Reject')}</Button></>)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {list && <Pagination meta={list} />}
            </Card>
        </AppLayout>
    );
}
