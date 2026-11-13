import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, CalendarClock, MapPin, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/Components/ui';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { ease } from '@/lib/motion';
import type { SharedProps } from '@/types';

type Item = { id: number; name: string; starts_at: string; mode: string; message: string | null; lawyer: string | null; received_at: string };

/**
 * Header icon for new appointment and consultation requests (workspace). The badge comes from the
 * shared `unread.appointments` prop and refreshes quietly every minute; the list loads when opened
 * (GET appointments.recent). Lawyers see their own requests, managers the whole organization's.
 */
export function AppointmentsMenu() {
    const t = useT();
    const { locale } = useLocale();
    const { unread } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Item[] | null>(null);
    const [count, setCount] = useState(unread?.appointments ?? 0);
    const [url, setUrl] = useState(route('appointments.index', { scope: 'requests' }));
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => setCount(unread?.appointments ?? 0), [unread?.appointments]);

    function load(signal?: AbortSignal) {
        return fetch(route('appointments.recent'), { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: { items: Item[]; count: number; url: string }) => {
                setItems(data.items);
                setCount(data.count);
                setUrl(data.url);
            })
            .catch(() => setItems((current) => current ?? []));
    }

    useEffect(() => {
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        load(controller.signal);
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

    const when = (iso: string) => `${formatDate(iso, locale, { weekday: 'short', day: 'numeric', month: 'short' })}, ${new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))}`;

    return (
        <div className="relative" ref={box}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={count ? t(':count new appointment requests', { count }) : t('Appointment requests')} title={t('Appointment requests')}
                className="relative rounded-md p-2 text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-gold-300">
                <CalendarClock className="size-4" />
                {count > 0 && (
                    <>
                        <motion.span className="absolute end-1 top-1 size-4 rounded-full bg-gold-400" animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} aria-hidden />
                        <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-950">{count > 99 ? '99+' : count}</span>
                    </>
                )}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease }}
                        className="absolute end-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-navy-700 dark:bg-navy-900">
                        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3 dark:border-navy-800">
                            <p className="text-sm font-semibold">{t('Consultation requests')}</p>
                            {count > 0 && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700">{t(':count waiting', { count })}</span>}
                        </div>
                        <ul className="max-h-96 divide-y divide-navy-50 overflow-y-auto dark:divide-navy-800">
                            {items === null && Array.from({ length: 2 }, (_, i) => <li key={i} className="flex gap-3 px-4 py-3"><span className="size-8 animate-pulse rounded-full bg-navy-100 dark:bg-navy-800" /><span className="h-8 flex-1 animate-pulse rounded bg-navy-100 dark:bg-navy-800" /></li>)}
                            {items?.length === 0 && (
                                <li className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-navy-500"><CalendarCheck className="size-6 text-verdant-600" />{t('No requests waiting. You are all caught up.')}</li>
                            )}
                            {items?.map((item) => (
                                <li key={item.id}>
                                    <Link href={url} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-navy-50 dark:hover:bg-navy-800/60">
                                        <Avatar name={item.name} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-semibold text-navy-900 dark:text-white">{item.name}</span>
                                                <span className="shrink-0 text-[11px] text-navy-400">{formatDate(item.received_at, locale, { day: 'numeric', month: 'short' })}</span>
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-1 text-xs text-navy-600 dark:text-navy-300">{item.mode.toLowerCase().includes('online') ? <Video className="size-3" /> : <MapPin className="size-3" />}{when(item.starts_at)}{item.lawyer ? ` · ${item.lawyer}` : ''}</span>
                                            {item.message && <span className="mt-0.5 block truncate text-xs text-navy-500">{item.message}</span>}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link href={url} onClick={() => setOpen(false)} className="block border-t border-navy-100 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:text-navy-200 dark:hover:bg-navy-800">{t('Review all requests')}</Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
