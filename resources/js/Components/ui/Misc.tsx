import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: string; href?: string }[] }) {
    return (
        <div className="mb-6">
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400">
                    {breadcrumbs.map((crumb, index) => (
                        <span key={index} className="flex items-center gap-1.5">
                            {index > 0 && <span aria-hidden>/</span>}
                            {crumb.href ? (
                                <Link href={crumb.href} className="hover:text-navy-800 dark:hover:text-navy-100">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span>{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-navy-900 sm:text-[28px] dark:text-white">{title}</h1>
                    {description && <p className="mt-1 text-sm text-navy-600 dark:text-navy-400">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            {icon && <div className="mb-3 rounded-full bg-navy-50 p-3 text-navy-500 dark:bg-navy-800 dark:text-navy-300">{icon}</div>}
            <p className="font-medium text-navy-900 dark:text-white">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-navy-500 dark:text-navy-400">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/**
 * A figure and its label in tabular numerals. Icons sit inline beside the label
 * at label size, never in a coloured tile (Hallmark app-screen rule).
 */
export function Stat({ label, value, hint, icon, href, tone = 'navy' }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; href?: string; tone?: 'navy' | 'green' | 'gold' | 'red' }) {
    const figure = { navy: 'text-navy-900 dark:text-white', green: 'text-verdant-700 dark:text-verdant-300', gold: 'text-gold-700 dark:text-gold-300', red: 'text-red-700 dark:text-red-300' }[tone];
    const body = (
        <div className="h-full rounded-card border border-navy-100 bg-white px-4 py-3.5 transition-colors dark:border-navy-800 dark:bg-navy-900">
            <p className="flex items-center gap-1.5 text-[13px] text-navy-600 dark:text-navy-300">
                {icon && <span className="shrink-0 text-navy-400 [&>svg]:size-4" aria-hidden>{icon}</span>}
                <span className="truncate">{label}</span>
            </p>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums', figure)}>{value}</p>
            {hint && <p className="mt-0.5 text-xs text-navy-500 dark:text-navy-400">{hint}</p>}
        </div>
    );
    return href ? (
        <Link href={href} className="block rounded-card hover:[&>div]:border-navy-300 dark:hover:[&>div]:border-navy-600">
            {body}
        </Link>
    ) : (
        body
    );
}

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-24 text-2xl' };
    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
    return src ? (
        <img src={src} alt={name} className={cn('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-navy-800', sizes[size])} />
    ) : (
        <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-navy-800 font-semibold text-gold-200 dark:bg-navy-700', sizes[size])} aria-hidden>
            {initials}
        </span>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-md bg-navy-100 dark:bg-navy-800', className)} />;
}

/** Labels information provenance — verified by platform vs. self-reported vs. platform-generated. */
export function Provenance({ kind, label }: { kind: 'verified' | 'reported' | 'platform'; label: string }) {
    const style = {
        verified: 'text-verdant-700 dark:text-verdant-300',
        reported: 'text-navy-500 dark:text-navy-400',
        platform: 'text-sky-700 dark:text-sky-300',
    }[kind];
    return <span className={cn('text-xs font-medium', style)}>{label}</span>;
}
