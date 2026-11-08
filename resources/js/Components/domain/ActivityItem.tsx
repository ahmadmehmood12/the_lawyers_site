import { Link } from '@inertiajs/react';
import { Avatar } from '@/Components/ui';
import { formatDateTime } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

export type ActivityEntry = { id: number; sentence: string; actor: string; actor_avatar: string | null; icon: string; url: string | null; log: string; created_at: string };

/** One readable audit line: "Ayesha Siddiqui opened a new case: State vs. Rashid Ahmed". */
export function ActivityItem({ item, compact = false }: { item: ActivityEntry; compact?: boolean }) {
    const { locale } = useLocale();
    const body = (
        <span className="flex items-start gap-3">
            <Avatar name={item.actor} src={item.actor_avatar} size="sm" />
            <span className="min-w-0">
                <span className={compact ? 'block text-sm leading-snug' : 'block text-sm leading-relaxed'}>{item.sentence}</span>
                <span className="block text-xs text-navy-500 dark:text-navy-400">{formatDateTime(item.created_at, locale)}</span>
            </span>
        </span>
    );

    return item.url ? (
        <Link href={item.url} className="block rounded-md p-1 -m-1 hover:bg-navy-50 dark:hover:bg-navy-800/50">
            {body}
        </Link>
    ) : (
        <div>{body}</div>
    );
}
