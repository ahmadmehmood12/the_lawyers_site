import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCheck, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

/**
 * WhatsApp-style reminder that slides in over the hero capture. The wording follows the
 * platform's own hearing_reminder template; names are the demo matter shown in the capture.
 */
export function WhatsAppAlert({ siteName }: { siteName: string }) {
    const t = useT();
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(Boolean(reduce));

    useEffect(() => {
        if (reduce) return;
        const timer = setTimeout(() => setShown(true), 1400);
        return () => clearTimeout(timer);
    }, [reduce]);

    return (
        <AnimatePresence>
            {shown && (
                <motion.div
                    role="img"
                    aria-label={t('Example WhatsApp hearing reminder')}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute -bottom-6 start-4 z-10 w-[min(20rem,85%)] rounded-xl border border-black/5 bg-white p-3 shadow-pop sm:start-8 dark:bg-navy-900 dark:border-white/10"
                >
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-verdant-500 text-white"><MessageCircle className="size-4" aria-hidden /></span>
                        <p className="text-xs font-semibold text-navy-900 dark:text-white">{siteName}</p>
                        <span className="ms-auto text-[10px] text-navy-400">{t('WhatsApp')}</span>
                    </div>
                    <p className="mt-2 rounded-lg bg-verdant-100 px-3 py-2 text-xs leading-snug text-navy-900">
                        {t('Reminder: your case “State vs. Rashid Ahmed” is fixed for hearing tomorrow at 9:30 am before Additional Sessions Judge III.')}
                        <span className="ms-1 inline-flex translate-y-0.5 text-sky-500"><CheckCheck className="size-3.5" aria-hidden /></span>
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
