import { usePage } from '@inertiajs/react';
import { Scale } from 'lucide-react';
import { splitBrand } from '@/lib/brand';
import { cn } from '@/lib/cn';
import type { SharedProps } from '@/types';

/**
 * The site mark and name from Admin, Settings, Branding. Without an uploaded logo it draws the scales mark;
 * the first word is ink and the words after it are gold (splitBrand).
 */
export function Logo({ className, inverted, size = 'md' }: { className?: string; inverted?: boolean; size?: 'md' | 'lg' }) {
    const { app } = usePage<SharedProps>().props;
    const name = app?.name || 'WakeelDiary';
    const [first, rest] = splitBrand(name);
    const mark = size === 'lg' ? 'size-11' : 'size-8';

    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            {app?.logo_url ? (
                <img src={app.logo_url} alt="" className={cn(mark, 'rounded-md object-contain')} />
            ) : (
                <span className={cn('flex items-center justify-center rounded-md', mark, inverted ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-gold-300 dark:bg-gold-500 dark:text-navy-950')}>
                    <Scale className={size === 'lg' ? 'size-6' : 'size-[18px]'} strokeWidth={2.2} />
                </span>
            )}
            <span className={cn('font-serif font-semibold tracking-tight', size === 'lg' ? 'text-2xl' : 'text-lg', inverted ? 'text-white' : 'text-navy-900 dark:text-white')}>
                {first}
                {rest && <>{name.includes(' ') ? ' ' : ''}<span className="text-gold-500">{rest}</span></>}
            </span>
        </span>
    );
}
