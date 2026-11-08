import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const styles: Record<Tone, { box: string; icon: ReactNode }> = {
    info: { box: 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900', icon: <Info className="size-4" /> },
    success: { box: 'bg-verdant-50 text-verdant-900 ring-verdant-200 dark:bg-verdant-900/30 dark:text-verdant-100 dark:ring-verdant-800', icon: <CheckCircle2 className="size-4" /> },
    warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900', icon: <AlertTriangle className="size-4" /> },
    danger: { box: 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900', icon: <XCircle className="size-4" /> },
};

export function Alert({ tone = 'info', title, children, className, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
    return (
        <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg p-3.5 text-sm ring-1 ring-inset', styles[tone].box, className)}>
            <span className="mt-0.5 shrink-0">{styles[tone].icon}</span>
            <div className="min-w-0 flex-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
            </div>
            {action}
        </div>
    );
}
