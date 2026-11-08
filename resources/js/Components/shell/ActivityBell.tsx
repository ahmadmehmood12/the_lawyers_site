import { Link } from '@inertiajs/react';
import { Activity as ActivityIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActivityItem, type ActivityEntry } from '@/Components/domain/ActivityItem';
import { useT } from '@/lib/i18n';

const SEEN_KEY = 'activity-seen-id';
let cache: { at: number; items: ActivityEntry[] } | null = null;

async function loadRecent(force = false): Promise<ActivityEntry[]> {
    if (!force && cache && Date.now() - cache.at < 60_000) {
        return cache.items;
    }
    const response = await fetch(route('activity.recent'), { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
    if (!response.ok) {
        return [];
    }
    const items = ((await response.json()) as { items: ActivityEntry[] }).items;
    cache = { at: Date.now(), items };
    return items;
}

function readSeen(): number {
    try {
        return Number(localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {
        return 0;
    }
}

/** Header bell for the firm's activity feed (who did what), separate from personal notifications. */
export function ActivityBell() {
    const t = useT();
    const [items, setItems] = useState<ActivityEntry[] | null>(null);
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(0);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSeen(readSeen());
        loadRecent().then(setItems).catch(() => setItems([]));
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }
        const close = (event: MouseEvent | KeyboardEvent) => {
            if (event instanceof KeyboardEvent ? event.key === 'Escape' : !panel.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const unseen = (items ?? []).filter((item) => item.id > seen).length;

    function toggle() {
        const next = !open;
        setOpen(next);
        if (next) {
            loadRecent(true).then((fresh) => {
                setItems(fresh);
                const latest = fresh[0]?.id ?? 0;
                try {
                    localStorage.setItem(SEEN_KEY, String(latest));
                } catch {
                    // storage unavailable: the count simply resets next visit
                }
                setSeen(latest);
            }).catch(() => undefined);
        }
    }

    return (
        <div className="relative" ref={panel}>
            <button type="button" onClick={toggle} aria-expanded={open} aria-label={t('Team activity')} className="relative rounded-md p-2 text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800">
                <ActivityIcon className="size-4" />
                {unseen > 0 && <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-navy-900 px-1 text-[10px] font-bold text-white dark:bg-gold-400 dark:text-navy-950">{unseen > 9 ? '9+' : unseen}</span>}
            </button>
            {open && (
                <div className="absolute end-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-navy-700 dark:bg-navy-900">
                    <p className="border-b border-navy-100 px-4 py-3 text-sm font-semibold dark:border-navy-800">{t('Team activity')}</p>
                    <div className="max-h-96 overflow-y-auto">
                        {items === null ? (
                            <p className="px-4 py-6 text-center text-sm text-navy-500">{t('Loading…')}</p>
                        ) : items.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-navy-500">{t('No activity yet.')}</p>
                        ) : (
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {items.map((item) => <li key={item.id} className="px-4 py-3"><ActivityItem item={item} compact /></li>)}
                            </ul>
                        )}
                    </div>
                    <Link href={route('activity.index')} className="block border-t border-navy-100 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:text-navy-200 dark:hover:bg-navy-800">{t('See all activity')}</Link>
                </div>
            )}
        </div>
    );
}
