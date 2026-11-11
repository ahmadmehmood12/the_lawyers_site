import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Homepage ornament (docs/Features/Home-Page.md#demos): a gold pair of scales. Law books drop one by
 * one onto the left pan and statute sections float down onto the right; the beam tips towards the
 * heavier side on a spring and the pans stay level as they swing. Loops while on screen.
 */

const PIVOT = { x: 200, y: 92 };
const ARM = 132;
const CHAIN = 104;
const BOOKS = [
    { w: 64, h: 13, tone: 'fill-navy-800', band: 'fill-gold-400' },
    { w: 58, h: 12, tone: 'fill-red-900', band: 'fill-gold-300' },
    { w: 66, h: 14, tone: 'fill-verdant-800', band: 'fill-gold-400' },
    { w: 56, h: 12, tone: 'fill-navy-600', band: 'fill-gold-300' },
];
const SECTIONS = ['§ 302 PPC', 'Art. 199', '§ 497 CrPC', 'O. VII CPC'];
/** Order of arrivals: b = book (left pan), s = section (right pan). */
const SEQUENCE = ['b', 's', 'b', 'b', 's', 's', 'b', 's'] as const;

export function ScalesOfJustice({ className }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.4 });
    const reduce = useReducedMotion();
    const [step, setStep] = useState(reduce ? SEQUENCE.length : 0);
    const angle = useMotionValue(0);

    const arrived = SEQUENCE.slice(0, step);
    const books = arrived.filter((x) => x === 'b').length;
    const sections = arrived.filter((x) => x === 's').length;

    useEffect(() => {
        if (reduce || !inView) return;
        const timer = setTimeout(() => setStep((n) => (n >= SEQUENCE.length + 2 ? 0 : n + 1)), step >= SEQUENCE.length ? 2200 : 1500);
        return () => clearTimeout(timer);
    }, [step, inView, reduce]);

    useEffect(() => {
        const target = Math.max(-14, Math.min(14, (sections - books) * 6.5));
        const controls = animate(angle, target, { type: 'spring', stiffness: 60, damping: 7, mass: 1.2 });
        return () => controls.stop();
    }, [books, sections, angle]);

    const rad = useTransform(angle, (deg) => (deg * Math.PI) / 180);
    const leftX = useTransform(rad, (r) => PIVOT.x - ARM * Math.cos(r));
    const leftY = useTransform(rad, (r) => PIVOT.y - ARM * Math.sin(r));
    const rightX = useTransform(rad, (r) => PIVOT.x + ARM * Math.cos(r));
    const rightY = useTransform(rad, (r) => PIVOT.y + ARM * Math.sin(r));

    return (
        <div ref={ref} className={cn('relative', className)} aria-hidden>
            <div className="pointer-events-none absolute inset-x-10 top-10 h-3/4 rounded-full bg-gold-400/15 blur-3xl" />
            <svg viewBox="0 0 400 400" className="relative w-full overflow-visible">
                <defs>
                    <linearGradient id="sj-gold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--color-gold-200)" />
                        <stop offset="45%" stopColor="var(--color-gold-400)" />
                        <stop offset="100%" stopColor="var(--color-gold-700)" />
                    </linearGradient>
                    <linearGradient id="sj-gold-v" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-gold-300)" />
                        <stop offset="100%" stopColor="var(--color-gold-600)" />
                    </linearGradient>
                    <radialGradient id="sj-shine" cx="0.35" cy="0.3" r="0.7">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Base and pillar */}
                <ellipse cx="200" cy="378" rx="96" ry="10" className="fill-navy-900/10 dark:fill-black/30" />
                <path d="M128 372 Q200 344 272 372 Z" fill="url(#sj-gold-v)" />
                <rect x="150" y="360" width="100" height="12" rx="4" fill="url(#sj-gold)" />
                <rect x="194" y="96" width="12" height="266" rx="5" fill="url(#sj-gold-v)" />
                <rect x="186" y="230" width="28" height="8" rx="3" fill="url(#sj-gold)" />
                <rect x="186" y="320" width="28" height="8" rx="3" fill="url(#sj-gold)" />

                {/* Beam */}
                <Beam leftX={leftX} leftY={leftY} rightX={rightX} rightY={rightY} />
                <circle cx={PIVOT.x} cy={PIVOT.y} r="12" fill="url(#sj-gold)" />
                <circle cx={PIVOT.x} cy={PIVOT.y} r="12" fill="url(#sj-shine)" />
                <path d="M200 52 L210 72 L200 80 L190 72 Z" fill="url(#sj-gold)" />

                {/* Pans with their loads */}
                <Pan x={leftX} y={leftY}>
                    <AnimatePresence>
                        {Array.from({ length: books }).map((_, i) => {
                            const book = BOOKS[i % BOOKS.length];
                            return (
                                <motion.g key={`b${i}`} initial={{ y: -150, opacity: 0, rotate: -12 }} animate={{ y: 0, opacity: 1, rotate: i % 2 ? 2 : -2 }} exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: 'spring', stiffness: 170, damping: 14 }}>
                                    <g transform={`translate(${-book.w / 2}, ${CHAIN - 12 - (i + 1) * 13})`}>
                                        <rect width={book.w} height={book.h} rx="2" className={book.tone} />
                                        <rect x="4" y="2" width={book.w - 8} height="2" className="fill-white/70" />
                                        <rect x={book.w - 12} width="5" height={book.h} className={book.band} />
                                        <rect x="8" width="5" height={book.h} className={book.band} />
                                    </g>
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>
                </Pan>
                <Pan x={rightX} y={rightY}>
                    <AnimatePresence>
                        {Array.from({ length: sections }).map((_, i) => (
                            <motion.g key={`s${i}`} initial={{ y: -170, x: 40, opacity: 0, rotate: 25 }} animate={{ y: 0, x: 0, opacity: 1, rotate: 0 }} exit={{ opacity: 0, y: -20 }}
                                transition={{ type: 'spring', stiffness: 120, damping: 13 }}>
                                <g transform={`translate(${-34 + (i % 2) * 6}, ${CHAIN - 12 - (i + 1) * 15})`}>
                                    <rect width="68" height="14" rx="7" fill="url(#sj-gold)" />
                                    <text x="34" y="10" textAnchor="middle" className="fill-navy-950 font-sans text-[8px] font-bold">{SECTIONS[i % SECTIONS.length]}</text>
                                </g>
                            </motion.g>
                        ))}
                    </AnimatePresence>
                </Pan>
            </svg>

            {/* Sections drifting before they land */}
            {!reduce && SECTIONS.map((label, i) => (
                <motion.span key={label} className="pointer-events-none absolute rounded-full bg-gold-100/80 px-2 py-0.5 font-sans text-[10px] font-semibold text-gold-700 shadow-sm dark:bg-gold-500/15 dark:text-gold-300"
                    style={{ right: `${4 + i * 9}%`, top: `${8 + (i % 2) * 12}%` }}
                    animate={{ y: [0, -10, 0], opacity: [0.35, 0.9, 0.35] }} transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.6 }}>
                    {label}
                </motion.span>
            ))}
        </div>
    );
}

function Beam({ leftX, leftY, rightX, rightY }: { leftX: MotionValue<number>; leftY: MotionValue<number>; rightX: MotionValue<number>; rightY: MotionValue<number> }) {
    return (
        <>
            <motion.line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke="url(#sj-gold)" strokeWidth="9" strokeLinecap="round" />
            <motion.circle cx={leftX} cy={leftY} r="7" fill="url(#sj-gold)" />
            <motion.circle cx={rightX} cy={rightY} r="7" fill="url(#sj-gold)" />
        </>
    );
}

/** A pan hanging from a beam end; the group follows the end point so the pan stays level. */
function Pan({ x, y, children }: { x: MotionValue<number>; y: MotionValue<number>; children: ReactNode }) {
    return (
        <motion.g style={{ x, y }}>
            <line x1="0" y1="0" x2="-48" y2={CHAIN} stroke="var(--color-gold-500)" strokeWidth="1.6" />
            <line x1="0" y1="0" x2="48" y2={CHAIN} stroke="var(--color-gold-500)" strokeWidth="1.6" />
            <line x1="0" y1="0" x2="0" y2={CHAIN - 4} stroke="var(--color-gold-500)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            {children}
            <path d={`M-58 ${CHAIN} Q0 ${CHAIN + 34} 58 ${CHAIN} Z`} fill="url(#sj-gold)" />
            <ellipse cx="0" cy={CHAIN} rx="58" ry="5" fill="url(#sj-gold-v)" />
            <path d={`M-40 ${CHAIN + 8} Q0 ${CHAIN + 22} 30 ${CHAIN + 10}`} stroke="#fff" strokeOpacity="0.45" strokeWidth="2" fill="none" />
        </motion.g>
    );
}
