import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/Components/ui';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { ease } from '@/lib/motion';
import type { SharedProps } from '@/types';

type Item = { id: number; name: string; avatar: string | null; preview: string | null; mine: boolean; at: string | null; unread: number; context: string | null; url: string };

const xsrf = () => decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');

/**
 * Header messages menu (workspace and portal). The count comes from the shared `unread.messages`
 * prop; the list loads only when opened (GET inbox.recent). Mark as read posts to inbox.read.
 */
export function MessagesMenu() {
    const t = useT();
    const { locale } = useLocale();
    const { unread } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Item[] | null>(null);
    const [count, setCount] = useState(unread?.messages ?? 0);
    const [inboxUrl, setInboxUrl] = useState<string | null>(null);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => setCount(unread?.messages ?? 0), [unread?.messages]);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        fetch(route('inbox.recent'), { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: controller.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: { items: Item[]; unread: number; inbox_url: string }) => {
                setItems(data.items);
                setCount(data.unread);
                setInboxUrl(data.inbox_url);
            })
            .catch(() => setItems((current) => current ?? []));
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            controller.abort();
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    function markRead(item: Item) {
        setItems((list) => list?.map((x) => (x.id === item.id ? { ...x, unread: 0 } : x)) ?? null);
        fetch(route('inbox.read', item.id), { method: 'POST', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf(), 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { unread: number }) => setCount(data.unread))
            .catch(() => undefined);
    }

    const time = (iso: string) => (iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
        ? new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
        : formatDate(iso, locale, { day: 'numeric', month: 'short' }));

    return (
        <div className="relative" ref={box}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={count ? t(':count unread messages', { count }) : t('Messages')} className="relative rounded-md p-2 text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-gold-300">
                <MessageSquare className="size-4" />
                {count > 0 && <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-verdant-600 px-1 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease }}
                        className="absolute end-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-navy-700 dark:bg-navy-900"
                    >
                        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3 dark:border-navy-800">
                            <p className="text-sm font-semibold">{t('Messages')}</p>
                            {count > 0 && <span className="text-xs text-navy-500">{t(':count unread', { count })}</span>}
                        </div>
                        <ul className="max-h-96 divide-y divide-navy-50 overflow-y-auto dark:divide-navy-800">
                            {items === null && Array.from({ length: 3 }, (_, i) => <li key={i} className="flex gap-3 px-4 py-3"><span className="size-8 animate-pulse rounded-full bg-navy-100 dark:bg-navy-800" /><span className="h-8 flex-1 animate-pulse rounded bg-navy-100 dark:bg-navy-800" /></li>)}
                            {items?.length === 0 && <li className="px-4 py-8 text-center text-sm text-navy-500">{t('No conversations.')}</li>}
                            {items?.map((item) => (
                                <li key={item.id} className="group relative">
                                    <Link href={item.url} onClick={() => setOpen(false)} className={cn('flex gap-3 px-4 py-3 hover:bg-navy-50 dark:hover:bg-navy-800/60', item.unread > 0 && 'bg-verdant-50/50 dark:bg-verdant-900/10')}>
                                        <Avatar name={item.name} src={item.avatar} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className={cn('truncate text-sm', item.unread ? 'font-semibold text-navy-900 dark:text-white' : 'font-medium')}>{item.name}</span>
                                                {item.at && <span className="shrink-0 text-[11px] text-navy-400">{time(item.at)}</span>}
                                            </span>
                                            <span className="block truncate text-xs text-navy-500 dark:text-navy-400">{item.mine && `${t('You')}: `}{item.preview ?? item.context}</span>
                                        </span>
                                        {item.unread > 0 && <span className="mt-1 h-fit shrink-0 rounded-full bg-verdant-600 px-1.5 text-[10px] font-bold text-white">{item.unread}</span>}
                                    </Link>
                                    {item.unread > 0 && (
                                        <button type="button" onClick={() => markRead(item)} title={t('Mark as read')} aria-label={t('Mark as read')} className="absolute end-3 bottom-2 hidden rounded bg-white p-1 text-navy-500 shadow-sm group-hover:block group-focus-within:block hover:text-verdant-700 dark:bg-navy-900">
                                            <Check className="size-3.5" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <button type="button" onClick={() => { setOpen(false); router.visit(inboxUrl ?? route(route().has('messages.index') ? 'messages.index' : 'portal.messages.index')); }} className="block w-full border-t border-navy-100 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:text-navy-200 dark:hover:bg-navy-800">
                            {t('Open inbox')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
