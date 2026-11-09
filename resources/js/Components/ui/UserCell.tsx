import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from './Misc';

/**
 * Person (or organization) column for data tables: round photo, name, optional second line.
 * Without a photo the Avatar shows initials. Used for every user/lawyer/client column.
 */
export function UserCell({ name, avatar, subtitle, extra, className }: { name: string; avatar?: string | null; subtitle?: ReactNode; extra?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex min-w-0 items-center gap-3', className)}>
            <Avatar name={name} src={avatar} size="sm" />
            <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 truncate font-medium text-navy-900 dark:text-white">{name}{extra}</p>
                {subtitle && <p className="truncate text-xs text-navy-500 dark:text-navy-400">{subtitle}</p>}
            </div>
        </div>
    );
}
