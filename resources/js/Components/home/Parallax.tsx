import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';

/**
 * Scroll-linked depth: the child drifts against the scroll by `speed` (pixels over the
 * element's pass through the viewport). transform only; static with reduced motion.
 */
export function Parallax({ children, speed = 60, className, scale = false }: { children: ReactNode; speed?: number; className?: string; scale?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
    const s = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1, 0.97]);

    return (
        <div ref={ref} className={className}>
            <motion.div style={reduce ? undefined : { y, ...(scale ? { scale: s } : {}) }}>{children}</motion.div>
        </div>
    );
}

/** Maps a shared scroll progress to a vertical offset; for layered heroes. */
export function useLayer(progress: MotionValue<number>, distance: number): MotionValue<number> {
    return useTransform(progress, [0, 1], [0, distance]);
}
