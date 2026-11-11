import { motion } from 'framer-motion';
import type { ComponentProps, ReactNode } from 'react';
import { fadeUp, hoverLift, stagger } from '@/lib/motion';

/**
 * Reusable motion wrappers (docs/Features/Animations.md). They only animate transform and
 * opacity, run once per element when scrolled into view, and inherit reduced motion
 * from <MotionConfig reducedMotion="user">.
 */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' | 'article' }) {
    const Tag = motion[as];
    return (
        <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }} variants={fadeUp} transition={{ delay }}>
            {children}
        </Tag>
    );
}

/** Staggers its <StaggerItem> children when scrolled into view (lists, card grids, timelines). */
export function Stagger({ children, className, gap = 0.06, as = 'div', inView = true }: { children: ReactNode; className?: string; gap?: number; as?: 'div' | 'ul' | 'ol'; inView?: boolean }) {
    const Tag = motion[as];
    return (
        <Tag className={className} initial="hidden" {...(inView ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -8% 0px' } } : { animate: 'show' })} variants={stagger(gap)}>
            {children}
        </Tag>
    );
}

export function StaggerItem({ children, className, as = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'article' } & Omit<ComponentProps<typeof motion.div>, 'children' | 'className'>) {
    const Tag = motion[as] as typeof motion.div;
    return (
        <Tag className={className} variants={fadeUp} {...rest}>
            {children}
        </Tag>
    );
}

/** Card wrapper with the shared 4px hover lift. */
export function HoverCard({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div className={className} whileHover={hoverLift}>
            {children}
        </motion.div>
    );
}
