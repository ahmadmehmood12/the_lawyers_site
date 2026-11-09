import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

/**
 * A short line-by-line "drafting" animation using the opening of the platform's own
 * post-arrest bail template, with case details filled in. Types once when in view;
 * shows the finished text straight away when motion is reduced.
 */
export function DraftingTyper() {
    const t = useT();
    const lines = [
        'IN THE COURT OF THE SESSIONS JUDGE, LAHORE',
        'Rashid Ahmed ... Petitioner',
        'VERSUS',
        'The State ... Respondent',
        'APPLICATION FOR POST-ARREST BAIL',
        'Respectfully Sheweth:',
    ];
    const full = lines.join('\n');
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
    const reduce = useReducedMotion();
    const [count, setCount] = useState(reduce ? full.length : 0);

    useEffect(() => {
        if (!inView || reduce) return;
        const timer = setInterval(() => setCount((c) => (c >= full.length ? (clearInterval(timer), c) : c + 2)), 28);
        return () => clearInterval(timer);
    }, [inView, reduce, full.length]);

    const typed = full.slice(0, count);

    return (
        <div ref={ref} className="rounded-xl border border-navy-100 bg-white p-4 shadow-pop dark:border-navy-700 dark:bg-navy-900" role="img" aria-label={t('A bail application being drafted from a template')}>
            <div className="mb-3 flex items-center justify-between text-[11px] text-navy-500">
                <span>{t('Drafting from template')}</span>
                <span className="rounded-full bg-gold-100 px-2 py-0.5 font-medium text-gold-700 dark:bg-gold-700/30 dark:text-gold-200">{t('Case details filled in')}</span>
            </div>
            <pre className="min-h-[9.5rem] font-serif text-[12px] leading-relaxed whitespace-pre-wrap text-navy-900 dark:text-navy-100" aria-hidden>
                {typed.split('\n').map((line, i) => (
                    <span key={i} className={i === 0 || i === 4 ? 'block text-center font-semibold' : i === 2 ? 'block text-center' : 'block'}>{line || ' '}</span>
                ))}
                {count < full.length && <span className="inline-block h-3.5 w-px animate-pulse bg-navy-900 align-middle dark:bg-white" />}
            </pre>
        </div>
    );
}
