import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion language (docs/Features/Animations.md). Every animated surface uses these so
 * timing feels consistent. Pages wrap content in <MotionConfig reducedMotion="user">
 * (AppLayout, PublicLayout, AuthLayout), so reduced-motion users get the end state.
 */
export const ease = [0.16, 1, 0.3, 1] as const;

export const durations = { fast: 0.18, base: 0.35, slow: 0.6 } as const;

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

/** Fade and rise 12px: section and card entrances. */
export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: durations.base, ease } },
};

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: durations.base, ease } },
};

/** Paper unfolding from the top edge: document previews, drafting. */
export const unfold: Variants = {
    hidden: { opacity: 0, scaleY: 0.96, transformOrigin: 'top' },
    show: { opacity: 1, scaleY: 1, transition: { duration: durations.slow, ease } },
};

/** Parent that staggers its children (use with fadeUp children). */
export const stagger = (gap = 0.06, delay = 0): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Small horizontal shake for invalid form submissions. */
export const shake = { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } };

/** Card hover: 4px lift, no scale (keeps text crisp). */
export const hoverLift = { y: -4, transition: { duration: durations.fast } };

/** Content swap between pages or tabs. */
export const pageTransition: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease } },
};
