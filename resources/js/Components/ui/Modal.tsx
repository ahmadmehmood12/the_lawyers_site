import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

type ModalProps = { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' };

const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Accessible modal built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(event) => event.target === ref.current && onClose()}
            className={cn(
                'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-navy-900 shadow-pop backdrop:bg-navy-950/50 backdrop:backdrop-blur-[2px]',
                'sm:m-auto sm:rounded-2xl dark:bg-navy-900 dark:text-navy-100',
                widths[size],
            )}
        >
            {open && (
                <div className="flex max-h-[92dvh] flex-col">
                    <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-4 dark:border-navy-800">
                        <div>
                            <h2 className="text-lg font-semibold">{title}</h2>
                            {description && <p className="mt-0.5 text-sm text-navy-500 dark:text-navy-400">{description}</p>}
                        </div>
                        <button type="button" onClick={onClose} className="rounded-md p-1 text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label="Close">
                            <X className="size-5" />
                        </button>
                    </div>
                    <div className="overflow-y-auto px-5 py-4">{children}</div>
                    {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-navy-100 bg-navy-50/50 px-5 py-3 dark:border-navy-800 dark:bg-navy-950/40">{footer}</div>}
                </div>
            )}
        </dialog>
    );
}
