import { Link } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400',
    secondary:
        'bg-white text-navy-800 ring-1 ring-inset ring-navy-200 hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-100 dark:ring-navy-700 dark:hover:bg-navy-800',
    ghost: 'text-navy-700 hover:bg-navy-100 hover:text-navy-950 dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-gold-300',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    success: 'bg-verdant-700 text-white hover:bg-verdant-800',
    gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
};

export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
    cn(
        'inline-flex shrink-0 items-center justify-center rounded font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
    );

type ButtonProps = ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode };

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...props }: ButtonProps) {
    return (
        <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...props}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, 'size'> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function LinkButton({ variant = 'primary', size = 'md', icon, className, children, ...props }: LinkButtonProps) {
    return (
        <Link className={buttonClasses(variant, size, className)} {...props}>
            {icon}
            {children}
        </Link>
    );
}
