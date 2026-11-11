import { Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Clock, ExternalLink, Eye, Heart, RotateCcw, Star, X, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, Card, ConfirmAction, EmptyState, PageHeader, Pagination, Tabs } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type State = 'pending' | 'approved' | 'rejected' | 'all';
type Tab = 'articles' | 'reviews' | 'comments';
type Props = {
    tab: Tab;
    state: State;
    counts: Record<State, number>;
    articles: Paginated<any> | null;
    reviews: Paginated<any> | null;
    comments: Paginated<any> | null;
};

/**
 * Admin moderation (ContentController::moderation). Each item shows only the decisions that make
 * sense for its current state: pending gets Approve / Reject, approved gets Unpublish, rejected
 * gets Approve after all. State filters with counts keep the pending queue in front.
 */
export default function Moderation({ tab, state, counts, articles, reviews, comments }: Props) {
    const t = useT();
    const list = articles ?? reviews ?? comments;
    const approvedWord = tab === 'articles' ? t('Published') : t('Approved');
    const states: { key: State; label: string; icon: ReactNode; tone: string }[] = [
        { key: 'pending', label: t('Waiting for review'), icon: <Clock className="size-4" />, tone: 'text-gold-700 dark:text-gold-300' },
        { key: 'approved', label: approvedWord, icon: <CheckCircle2 className="size-4" />, tone: 'text-verdant-700 dark:text-verdant-300' },
        { key: 'rejected', label: t('Rejected'), icon: <XCircle className="size-4" />, tone: 'text-red-700 dark:text-red-300' },
        { key: 'all', label: t('All'), icon: null, tone: '' },
    ];

    return (
        <AppLayout title={t('Moderation')} area="admin" wide>
            <PageHeader title={t('Content moderation')} description={t('Approve or reject what members post. Pending items are shown first.')} />
            <Tabs className="mb-4" active={tab} tabs={[
                { key: 'articles', label: t('Articles'), href: route('admin.articles.index', { tab: 'articles' }) },
                { key: 'reviews', label: t('Reviews'), href: route('admin.articles.index', { tab: 'reviews' }) },
                { key: 'comments', label: t('Comments'), href: route('admin.articles.index', { tab: 'comments' }) },
            ]} />

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {states.map((s) => (
                    <Link key={s.key} href={route('admin.articles.index', { tab, state: s.key })} preserveScroll
                        className={cn('flex items-center justify-between rounded-card border bg-white px-4 py-3 text-sm transition dark:bg-navy-900',
                            state === s.key ? 'border-navy-900 ring-1 ring-navy-900 dark:border-white dark:ring-white' : 'border-navy-100 hover:border-navy-300 dark:border-navy-800 dark:hover:border-navy-600')}>
                        <span className={cn('inline-flex items-center gap-2 font-medium', s.tone)}>{s.icon}{s.label}</span>
                        <span className="text-xl font-semibold tabular-nums">{counts[s.key]}</span>
                    </Link>
                ))}
            </div>

            <Card>
                {!list || list.data.length === 0 ? (
                    <EmptyState title={state === 'pending' ? t('All caught up') : t('Nothing here')} description={state === 'pending' ? t('Nothing is waiting for review.') : undefined} />
                ) : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        <AnimatePresence initial={false}>
                            {list.data.map((item: any) => <Item key={`${tab}-${item.id}`} tab={tab} item={item} />)}
                        </AnimatePresence>
                    </ul>
                )}
                {list && <Pagination meta={list} />}
            </Card>
        </AppLayout>
    );
}

function Item({ tab, item }: { tab: Tab; item: any }) {
    const t = useT();
    const { locale } = useLocale();
    const [busy, setBusy] = useState(false);
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'published' || item.status === 'approved';
    const isRejected = item.status === 'rejected';
    const routeName = { articles: 'admin.articles.moderate', reviews: 'admin.reviews.moderate', comments: 'admin.comments.moderate' }[tab];
    const approveValue = tab === 'articles' ? 'published' : 'approved';

    function decide(status: string) {
        router.put(route(routeName, item.id), { status }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    }

    const reject = (label: string, variant: 'danger' | 'ghost') => tab === 'articles'
        ? <ConfirmAction href={route(routeName, item.id)} method="put" data={{ status: 'rejected' }} reasonField="reason" title={isApproved ? t('Unpublish article?') : t('Reject article?')} description={t('The author sees this reason.')} trigger={(open) => <Button size="sm" variant={variant} icon={<X className="size-4" />} onClick={open}>{label}</Button>} />
        : <Button size="sm" variant={variant} icon={<X className="size-4" />} loading={busy} onClick={() => decide('rejected')}>{label}</Button>;

    return (
        <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn('relative px-5 py-4 text-sm', 'border-s-4', isPending ? 'border-s-gold-400 bg-gold-50/30 dark:bg-gold-500/5' : isApproved ? 'border-s-verdant-500' : 'border-s-red-400')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium text-navy-900 dark:text-white">
                        {tab === 'articles' ? item.title : tab === 'reviews' ? <>{item.author} <span className="text-navy-400">→</span> {item.lawyer}</> : <>{item.author} <span className="text-navy-500">{t('on')}</span> “{item.article}”</>}
                    </p>
                    {tab === 'reviews' && <p className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-3.5 ${i < item.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200'}`} />)}</p>}
                    {tab === 'articles'
                        ? <details><summary className="cursor-pointer text-navy-600 dark:text-navy-300">{item.excerpt ?? t('Read article')}</summary><div className="prose-legal mt-2 rounded bg-navy-50 p-3 dark:bg-navy-800" dangerouslySetInnerHTML={{ __html: item.body }} /></details>
                        : <p className="text-navy-700 dark:text-navy-200">{item.comment ?? item.body}</p>}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                        {tab === 'articles' && <span>{item.author}{item.category ? ` · ${item.category}` : ''}</span>}
                        <span>{formatDateTime(item.updated_at ?? item.created_at, locale)}</span>
                        {tab === 'articles' && <><span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{item.views}</span><span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{item.likes}</span></>}
                        {tab === 'articles' && isApproved && <a href={route('articles.show', item.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{t('View live')}<ExternalLink className="size-3" /></a>}
                        {tab === 'comments' && isApproved && <a href={route('articles.show', item.article_slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{t('View article')}<ExternalLink className="size-3" /></a>}
                    </p>
                    {isRejected && item.reason && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{t('Reason')}: {item.reason}</p>}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatePill status={item.status} label={item.status_label} by={item.moderator} />
                    <div className="flex flex-wrap justify-end gap-2">
                        {isPending && (
                            <>
                                <Button size="sm" variant="success" icon={<Check className="size-4" />} loading={busy} onClick={() => decide(approveValue)}>{tab === 'articles' ? t('Publish') : t('Approve')}</Button>
                                {reject(t('Reject'), 'danger')}
                            </>
                        )}
                        {isApproved && reject(tab === 'articles' ? t('Unpublish') : t('Hide'), 'ghost')}
                        {isRejected && <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} loading={busy} onClick={() => decide(approveValue)}>{tab === 'articles' ? t('Publish instead') : t('Approve instead')}</Button>}
                    </div>
                </div>
            </div>
        </motion.li>
    );
}

function StatePill({ status, label, by }: { status: string; label: string; by?: string | null }) {
    const t = useT();
    const styles = status === 'pending'
        ? 'bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-200'
        : status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-verdant-100 text-verdant-800 dark:bg-verdant-500/15 dark:text-verdant-200';
    const icon = status === 'pending' ? <Clock className="size-3.5" /> : status === 'rejected' ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', styles)}>
            {icon}{status === 'pending' ? t('Needs review') : label}{by && status !== 'pending' ? <span className="font-normal opacity-80">· {by}</span> : null}
        </span>
    );
}
