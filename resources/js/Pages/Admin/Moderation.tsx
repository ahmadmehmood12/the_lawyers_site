import { Link, router } from '@inertiajs/react';
import { ArrowUpRight, Eye, Heart, MessageSquare, Newspaper, Star, Undo2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, Button, Card, EmptyState, PageHeader, Pagination, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type State = 'pending' | 'approved' | 'rejected' | 'all';
type Tab = 'articles' | 'reviews' | 'comments';
type Props = {
    tab: Tab;
    state: State;
    counts: Record<State, number>;
    waiting: Record<Tab, number>;
    articles: Paginated<any> | null;
    reviews: Paginated<any> | null;
    comments: Paginated<any> | null;
};

const routes: Record<Tab, string> = { articles: 'admin.articles.moderate', reviews: 'admin.reviews.moderate', comments: 'admin.comments.moderate' };

/**
 * Admin moderation as a review queue (ContentController::moderation): pick an item on the left, read
 * it in full on the right and decide. Only the decisions valid for the item's state are offered;
 * sending back always asks for a reason the author will see.
 */
export default function Moderation({ tab, state, counts, waiting, articles, reviews, comments }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const list = (articles ?? reviews ?? comments) as Paginated<any> | null;
    const items = list?.data ?? [];
    const [selectedId, setSelectedId] = useState<number | null>(items[0]?.id ?? null);
    const selected = items.find((i: any) => i.id === selectedId) ?? items[0] ?? null;

    useEffect(() => {
        if (!items.some((i: any) => i.id === selectedId)) setSelectedId(items[0]?.id ?? null);
    }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

    const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
        { key: 'articles', label: t('Articles'), icon: <Newspaper className="size-4" /> },
        { key: 'reviews', label: t('Reviews'), icon: <Star className="size-4" /> },
        { key: 'comments', label: t('Comments'), icon: <MessageSquare className="size-4" /> },
    ];
    const approvedWord = tab === 'articles' ? t('Published') : t('Approved');
    const states: { key: State; label: string }[] = [
        { key: 'pending', label: t('Waiting') },
        { key: 'approved', label: approvedWord },
        { key: 'rejected', label: tab === 'articles' ? t('Sent back') : t('Rejected') },
        { key: 'all', label: t('All') },
    ];
    const totalWaiting = waiting.articles + waiting.reviews + waiting.comments;

    return (
        <AppLayout title={t('Articles & reviews')} area="admin" wide>
            <PageHeader title={t('Articles & reviews')} description={totalWaiting > 0 ? t(':count items are waiting for a decision.', { count: totalWaiting }) : t('Nothing is waiting. New submissions appear here first.')} />

            <div className="mb-4 flex flex-col gap-3 border-b border-navy-100 lg:flex-row lg:items-end lg:justify-between dark:border-navy-800">
                <nav className="-mb-px flex gap-6" aria-label={t('Content type')}>
                    {tabs.map((item) => (
                        <Link key={item.key} href={route('admin.articles.index', { tab: item.key })} preserveScroll
                            className={cn('inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition', tab === item.key ? 'border-navy-900 text-navy-900 dark:border-white dark:text-white' : 'border-transparent text-navy-500 hover:text-navy-800 dark:hover:text-navy-200')}>
                            {item.icon}{item.label}
                            {waiting[item.key] > 0 && <span className="rounded-full bg-gold-100 px-1.5 text-[11px] font-semibold text-gold-700 tabular-nums">{waiting[item.key]}</span>}
                        </Link>
                    ))}
                </nav>
                <div className="mb-3 inline-flex rounded-lg bg-navy-50 p-0.5 text-sm dark:bg-navy-900" role="tablist" aria-label={t('Status')}>
                    {states.map((s) => (
                        <Link key={s.key} href={route('admin.articles.index', { tab, state: s.key })} preserveScroll role="tab" aria-selected={state === s.key}
                            className={cn('rounded-md px-3 py-1.5 font-medium transition', state === s.key ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-navy-500 hover:text-navy-800 dark:hover:text-navy-200')}>
                            {s.label} <span className="ms-1 text-xs tabular-nums text-navy-400">{counts[s.key]}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {!list || items.length === 0 ? (
                <Card><EmptyState title={state === 'pending' ? t('All caught up') : t('Nothing here')} description={state === 'pending' ? t('There is nothing to review right now.') : undefined} /></Card>
            ) : (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                    <Card className="overflow-hidden lg:sticky lg:top-20">
                        <ul className="max-h-[calc(100dvh-14rem)] divide-y divide-navy-100 overflow-y-auto dark:divide-navy-800">
                            {items.map((item: any) => (
                                <li key={item.id}>
                                    <button type="button" onClick={() => setSelectedId(item.id)} aria-current={selected?.id === item.id}
                                        className={cn('relative flex w-full gap-3 px-4 py-3 text-start transition', selected?.id === item.id ? 'bg-navy-50 dark:bg-navy-800/70' : 'hover:bg-navy-50/60 dark:hover:bg-navy-800/40')}>
                                        {selected?.id === item.id && <span className="absolute inset-y-0 start-0 w-0.5 bg-navy-900 dark:bg-gold-400" />}
                                        <Avatar name={item.author} src={item.author_avatar} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className="truncate text-sm font-medium text-navy-900 dark:text-white">{tab === 'articles' ? item.title : tab === 'reviews' ? item.lawyer : item.article}</span>
                                                <Dot status={item.status} />
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs text-navy-500">
                                                {tab === 'reviews' ? <>{'★'.repeat(item.rating)} · {item.author}</> : item.author} · {formatDate(item.updated_at ?? item.created_at, locale, { day: 'numeric', month: 'short' })}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {list.last_page > 1 && <div className="border-t border-navy-100 dark:border-navy-800"><Pagination meta={list} /></div>}
                    </Card>

                    {selected && <Detail key={`${tab}-${selected.id}`} tab={tab} item={selected} state={state} page={list.current_page} />}
                </div>
            )}
        </AppLayout>
    );
}

function Dot({ status }: { status: string }) {
    const t = useT();
    const map: Record<string, [string, string]> = {
        pending: ['bg-gold-500', t('Waiting')],
        published: ['bg-verdant-500', t('Published')],
        approved: ['bg-verdant-500', t('Approved')],
        rejected: ['bg-red-500', t('Rejected')],
    };
    const [color, label] = map[status] ?? ['bg-navy-300', status];
    return <span className={cn('size-2 shrink-0 rounded-full', color)} title={label} aria-label={label} />;
}

function Detail({ tab, item, state, page }: { tab: Tab; item: any; state: State; page: number }) {
    const t = useT();
    const { locale } = useLocale();
    const [sendingBack, setSendingBack] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const isPending = item.status === 'pending';
    const isLive = item.status === 'published' || item.status === 'approved';
    const isRejected = item.status === 'rejected';
    const approve = tab === 'articles' ? 'published' : 'approved';

    function decide(status: string) {
        router.post(route(routes[tab], item.id), { status, reason: status === 'rejected' ? reason.trim() || null : null, state, page }, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => { setSendingBack(false); setReason(''); },
        });
    }

    const statusLine = isPending
        ? t('Waiting for a decision')
        : isLive
            ? `${tab === 'articles' ? t('Published') : t('Approved')}${item.moderator ? ` ${t('by')} ${item.moderator}` : ''}`
            : `${tab === 'articles' ? t('Sent back') : t('Rejected')}${item.moderator ? ` ${t('by')} ${item.moderator}` : ''}`;

    return (
        <Card className="overflow-hidden">
            <div className="border-b border-navy-100 px-6 py-5 dark:border-navy-800">
                <p className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-medium', isPending ? 'text-gold-700 dark:text-gold-300' : isLive ? 'text-verdant-700 dark:text-verdant-300' : 'text-red-700 dark:text-red-300')}>
                    <Dot status={item.status} />{statusLine}
                </p>
                {tab === 'articles' && <h2 className="font-serif text-2xl font-semibold leading-snug text-navy-900 dark:text-white">{item.title}</h2>}
                {tab === 'reviews' && (
                    <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-navy-900 dark:text-white">
                        <span className="text-gold-500">{'★'.repeat(item.rating)}<span className="text-navy-200 dark:text-navy-700">{'★'.repeat(5 - item.rating)}</span></span>
                        {item.title}
                    </h2>
                )}
                {tab === 'comments' && <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{t('Comment on')} “{item.article}”</h2>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-navy-600 dark:text-navy-300">
                    <span className="inline-flex items-center gap-2"><Avatar name={item.author} src={item.author_avatar} size="sm" />{item.author}</span>
                    {tab === 'reviews' && <span>{t('for')} <span className="font-medium text-navy-800 dark:text-navy-100">{item.lawyer}</span></span>}
                    {item.category && <span>{item.category}</span>}
                    <span>{formatDateTime(item.updated_at ?? item.created_at, locale)}</span>
                    {tab === 'articles' && <><span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{item.views}</span><span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{item.likes}</span></>}
                    {tab === 'articles' && isLive && <a href={route('articles.show', item.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-navy-800 hover:underline dark:text-navy-100">{t('View live')}<ArrowUpRight className="size-3.5" /></a>}
                    {tab === 'comments' && <a href={route('articles.show', item.article_slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-navy-800 hover:underline dark:text-navy-100">{t('Open article')}<ArrowUpRight className="size-3.5" /></a>}
                </div>
                {tab === 'articles' && item.tags?.length > 0 && <p className="mt-3 flex flex-wrap gap-1.5">{item.tags.map((tag: string) => <span key={tag} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-600 dark:bg-navy-800 dark:text-navy-300">#{tag}</span>)}</p>}
            </div>

            {isRejected && item.reason && (
                <div className="border-b border-red-100 bg-red-50/60 px-6 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-200">
                    <span className="font-semibold">{t('Reason given')}:</span> {item.reason}
                </div>
            )}

            <div className="max-h-[60dvh] overflow-y-auto px-6 py-5" dir={item.language === 'ur' ? 'rtl' : undefined}>
                {tab === 'articles' ? (
                    <>
                        {item.excerpt && <p className="mb-4 text-lg leading-relaxed text-navy-600 dark:text-navy-300">{item.excerpt}</p>}
                        <div className="prose-legal max-w-none" dangerouslySetInnerHTML={{ __html: item.body }} />
                    </>
                ) : (
                    <p className="whitespace-pre-line text-base leading-relaxed text-navy-800 dark:text-navy-100">{item.comment ?? item.body}</p>
                )}
            </div>

            <div className="sticky bottom-0 border-t border-navy-100 bg-navy-50/80 px-6 py-4 backdrop-blur dark:border-navy-800 dark:bg-navy-900/80">
                {sendingBack ? (
                    <div className="space-y-3">
                        <Textarea label={tab === 'articles' ? t('What should the author change?') : t('Reason (optional)')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
                            hint={tab === 'articles' ? t('The author sees this in their email and on the article.') : undefined} />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => { setSendingBack(false); setReason(''); }}>{t('Cancel')}</Button>
                            <Button variant="danger" loading={busy} disabled={tab === 'articles' && reason.trim().length < 3} onClick={() => decide('rejected')}>
                                {tab === 'articles' ? (isLive ? t('Unpublish and send back') : t('Send back to author')) : t('Reject')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-navy-500">
                            {isPending ? t('Read it through, then decide.') : isLive ? t('This is public. You can take it down if needed.') : t('This is hidden from the public.')}
                        </p>
                        <div className="flex gap-2">
                            {(isPending || isLive) && (
                                <Button variant={isPending ? 'secondary' : 'ghost'} onClick={() => setSendingBack(true)}>
                                    {tab === 'articles' ? (isLive ? t('Unpublish') : t('Send back')) : isLive ? t('Hide') : t('Reject')}
                                </Button>
                            )}
                            {(isPending || isRejected) && (
                                <Button variant={isPending ? 'primary' : 'secondary'} icon={isRejected ? <Undo2 className="size-4" /> : undefined} loading={busy} onClick={() => decide(approve)}>
                                    {tab === 'articles' ? (isRejected ? t('Publish anyway') : t('Publish')) : isRejected ? t('Approve anyway') : t('Approve')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
