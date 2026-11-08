import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn('rounded-card border border-navy-100 bg-white shadow-card dark:border-navy-800 dark:bg-navy-900', className)}
            {...props}
        />
    );
}

type CardHeaderProps = { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string };

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-navy-100 px-5 py-4 dark:border-navy-800', className)}>
            <div className="min-w-0">
                <h3 className="font-sans text-[15px] font-semibold text-navy-900 dark:text-white">{title}</h3>
                {description && <p className="mt-0.5 text-sm text-navy-500 dark:text-navy-400">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('px-5 py-4', className)} {...props} />;
}

/** Definition list for record details. */
export function DetailList({ items, columns = 2 }: { items: { label: ReactNode; value: ReactNode; hidden?: boolean }[]; columns?: 1 | 2 | 3 }) {
    const grid = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns];
    return (
        <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', grid)}>
            {items
                .filter((item) => !item.hidden)
                .map((item, index) => (
                    <div key={index} className="min-w-0">
                        <dt className="text-[13px] font-medium text-navy-500 dark:text-navy-400">{item.label}</dt>
                        <dd className="mt-1 text-sm break-words text-navy-900 dark:text-navy-100">{item.value || '—'}</dd>
                    </div>
                ))}
        </dl>
    );
}
