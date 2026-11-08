import { usePage } from '@inertiajs/react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SharedProps } from '@/types';

/** Toast for session flash messages; auto-dismisses after 5s. */
export function Flash() {
    const { flash } = usePage<SharedProps>().props;
    const [visible, setVisible] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (flash.success) setVisible({ tone: 'success', message: flash.success });
        else if (flash.error) setVisible({ tone: 'error', message: flash.error });
    }, [flash.success, flash.error]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => setVisible(null), 5000);
        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="no-print fixed inset-x-3 bottom-20 z-50 flex justify-center sm:inset-x-auto sm:end-6 sm:bottom-6" role="status" aria-live="polite">
            <div className="flex max-w-md items-start gap-3 rounded-lg bg-navy-900 px-4 py-3 text-sm text-white shadow-pop dark:bg-navy-800">
                {visible.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 text-verdant-300" /> : <XCircle className="mt-0.5 size-4 text-red-300" />}
                <p className="flex-1">{visible.message}</p>
                <button type="button" onClick={() => setVisible(null)} aria-label="Dismiss" className="text-navy-300 hover:text-white">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
