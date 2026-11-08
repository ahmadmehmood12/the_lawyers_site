import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type Item = { label: ReactNode; href?: string; onClick?: () => void; icon?: ReactNode; danger?: boolean; method?: 'post' | 'delete' };

export function Dropdown({ trigger, items, align = 'end', className }: { trigger: ReactNode; items: (Item | 'divider')[]; align?: 'start' | 'end'; className?: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (event: MouseEvent | KeyboardEvent) => {
            if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, []);

    const itemClass = (danger?: boolean) =>
        cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm',
            danger ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40' : 'text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800',
        );

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="flex items-center">
                {trigger}
            </button>
            {open && (
                <div
                    role="menu"
                    className={cn(
                        'absolute z-40 mt-2 min-w-52 rounded-lg border border-navy-100 bg-white p-1 shadow-pop dark:border-navy-700 dark:bg-navy-900',
                        align === 'end' ? 'end-0' : 'start-0',
                    )}
                >
                    {items.map((item, index) =>
                        item === 'divider' ? (
                            <div key={index} className="my-1 border-t border-navy-100 dark:border-navy-800" />
                        ) : item.href ? (
                            <Link key={index} href={item.href} method={item.method} as={item.method ? 'button' : 'a'} className={itemClass(item.danger)} onClick={() => setOpen(false)}>
                                {item.icon}
                                {item.label}
                            </Link>
                        ) : (
                            <button
                                key={index}
                                type="button"
                                className={itemClass(item.danger)}
                                onClick={() => {
                                    setOpen(false);
                                    item.onClick?.();
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
