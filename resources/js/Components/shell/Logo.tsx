import { Scale } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <span className={cn('flex size-8 items-center justify-center rounded-md', inverted ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-gold-300 dark:bg-gold-500 dark:text-navy-950')}>
                <Scale className="size-[18px]" strokeWidth={2.2} />
            </span>
            <span className={cn('font-serif text-lg font-semibold tracking-tight', inverted ? 'text-white' : 'text-navy-900 dark:text-white')}>
                Wakeel<span className="text-gold-500">Diary</span>
            </span>
        </span>
    );
}
