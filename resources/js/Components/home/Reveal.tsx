import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Scroll reveal used across the homepage: a short fade and 12px rise, once per element.
 * Content is fully visible if motion is reduced (MotionConfig reducedMotion="user" on the page).
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}
