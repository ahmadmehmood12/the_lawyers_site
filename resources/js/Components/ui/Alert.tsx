import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Solid notice: dark fill, white text and a coloured edge (no pastel tints). Follows the theme, so
 * “info” is the brand navy (dark green in the white and green theme).
 */
const styles: Record<Tone, { box: string; icon: ReactNode }> = {
    info: { box: 'bg-navy-900 border-gold-500 dark:bg-navy-800', icon: <Info className="size-4 text-gold-400" /> },
    success: { box: 'bg-verdant-800 border-verdant-400 dark:bg-verdant-900', icon: <CheckCircle2 className="size-4 text-verdant-300" /> },
    warning: { box: 'bg-amber-900 border-amber-400 dark:bg-amber-950', icon: <AlertTriangle className="size-4 text-amber-300" /> },
    danger: { box: 'bg-red-800 border-red-300 dark:bg-red-950', icon: <XCircle className="size-4 text-red-200" /> },
};

export function Alert({ tone = 'info', title, children, className, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
    return (
        <div role={tone === 'danger' ? 'alert' : 'status'}
            className={cn('flex items-start gap-3 rounded border-s-4 px-4 py-3 text-sm leading-relaxed text-white shadow-sm [&_a]:text-white [&_a]:underline', styles[tone].box, className)}>
            <span className="mt-0.5 shrink-0">{styles[tone].icon}</span>
            <div className="min-w-0 flex-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={cn(title && 'mt-0.5', 'text-white/85')}>{children}</div>}
            </div>
            {action && <div className="shrink-0 self-center [&>*]:!bg-white [&>*]:!text-navy-950 [&>*]:!no-underline [&>*]:hover:!bg-white/90">{action}</div>}
        </div>
    );
}
