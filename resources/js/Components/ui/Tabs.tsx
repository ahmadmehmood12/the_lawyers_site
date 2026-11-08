import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TabItem = { key: string; label: ReactNode; href?: string; count?: number; hidden?: boolean };

/** Horizontally scrollable tab bar. Use `href` for server-routed tabs or `onChange` for client tabs. */
export function Tabs({ tabs, active, onChange, className }: { tabs: TabItem[]; active: string; onChange?: (key: string) => void; className?: string }) {
    return (
        <div className={cn('-mx-1 overflow-x-auto border-b border-navy-100 dark:border-navy-800', className)} role="tablist">
            <div className="flex min-w-max gap-1 px-1">
                {tabs
                    .filter((tab) => !tab.hidden)
                    .map((tab) => {
                        const classes = cn(
                            '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                            tab.key === active
                                ? 'border-gold-500 text-navy-900 dark:text-white'
                                : 'border-transparent text-navy-500 hover:border-navy-200 hover:text-navy-800 dark:text-navy-400 dark:hover:text-navy-100',
                        );
                        const content = (
                            <>
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className="rounded-full bg-navy-100 px-1.5 text-[11px] text-navy-600 dark:bg-navy-800 dark:text-navy-300">{tab.count}</span>
                                )}
                            </>
                        );
                        return tab.href ? (
                            <Link key={tab.key} href={tab.href} preserveScroll className={classes} role="tab" aria-selected={tab.key === active}>
                                {content}
                            </Link>
                        ) : (
                            <button key={tab.key} type="button" onClick={() => onChange?.(tab.key)} className={classes} role="tab" aria-selected={tab.key === active}>
                                {content}
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}
