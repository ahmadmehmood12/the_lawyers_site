import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'navy' | 'green' | 'gold' | 'red' | 'blue' | 'amber';

const tones: Record<Tone, string> = {
    neutral: 'bg-navy-50 text-navy-700 ring-navy-200 dark:bg-navy-800 dark:text-navy-200 dark:ring-navy-700',
    navy: 'bg-navy-900 text-white ring-navy-900 dark:bg-navy-700',
    green: 'bg-verdant-50 text-verdant-800 ring-verdant-200 dark:bg-verdant-900/40 dark:text-verdant-200 dark:ring-verdant-800',
    gold: 'bg-gold-50 text-gold-700 ring-gold-200 dark:bg-gold-700/20 dark:text-gold-200 dark:ring-gold-700',
    red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', tones[tone], className)}>
            {icon}
            {children}
        </span>
    );
}

/** Maps domain status values to badge tones so every page colours statuses the same way. */
const statusTones: Record<string, Tone> = {
    approved: 'green', paid: 'green', confirmed: 'green', held: 'green', done: 'green', published: 'green', active: 'green', delivered: 'green', read: 'green', decided: 'green', completed: 'green', reviewed: 'green',
    submitted: 'blue', under_review: 'blue', issued: 'blue', in_review: 'blue', in_progress: 'blue', filed: 'blue', under_trial: 'blue', evidence: 'blue', arguments: 'blue', sent: 'blue', trialing: 'blue',
    scheduled: 'navy',
    requested: 'gold', pending: 'gold', partially_paid: 'gold', information_requested: 'gold', adjourned: 'gold', rescheduled: 'gold', reserved: 'gold', queued: 'gold', open: 'gold', draft: 'neutral', past_due: 'amber',
    rejected: 'red', suspended: 'red', cancelled: 'red', void: 'red', failed: 'red', declined: 'red', dismissed: 'red', expired: 'red', no_show: 'red',
    urgent: 'red', high: 'amber', normal: 'neutral', low: 'neutral',
};

export function StatusBadge({ value, label }: { value: string | null | undefined; label?: string | null }) {
    if (!value) return null;
    return <Badge tone={statusTones[value] ?? 'neutral'}>{label ?? value}</Badge>;
}
