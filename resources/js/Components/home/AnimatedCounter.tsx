import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

/** Rounds large totals down and marks them with "+" (3,127 shows as 3,100+); small totals stay exact. */
export function displayTarget(value: number): { target: number; plus: boolean } {
    if (value >= 1000) return { target: Math.floor(value / 100) * 100, plus: value % 100 !== 0 };
    if (value >= 100) return { target: Math.floor(value / 10) * 10, plus: value % 10 !== 0 };
    return { target: value, plus: false };
}

/** Counts from 0 to the real value the first time it scrolls into view; never replays on minor scrolls. */
export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
    const { locale } = useLocale();
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
    const reduce = useReducedMotion();
    const { target, plus } = displayTarget(value);
    const [shown, setShown] = useState(reduce ? target : 0);

    useEffect(() => {
        if (!inView) return;
        if (reduce) {
            setShown(target);
            return;
        }
        const controls = animate(0, target, { duration: Math.min(2.2, 0.8 + Math.log10(target + 1) * 0.4), ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) });
        return () => controls.stop();
    }, [inView, target, reduce]);

    return (
        <span ref={ref} className={className} aria-label={`${formatNumber(target, locale)}${plus ? '+' : ''}`}>
            <span aria-hidden>{formatNumber(shown, locale)}{plus && shown === target ? '+' : ''}</span>
        </span>
    );
}
