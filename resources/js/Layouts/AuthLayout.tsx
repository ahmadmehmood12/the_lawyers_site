import { Head, Link, usePage } from '@inertiajs/react';
import { MotionConfig, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { BadgeCheck, BellRing, CalendarDays, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Flash } from '@/Components/ui';
import { Logo } from '@/Components/shell/Logo';
import { LanguageSwitcher, ThemeToggle } from '@/Components/shell/Preferences';
import { cn } from '@/lib/cn';
import { ease, shake } from '@/lib/motion';
import { useLocale, useT } from '@/lib/i18n';
import type { AuthMedia, SharedProps } from '@/types';

/** Product animations for the promotional panel, one per page (docs/Features/Home-Page.md#demos). */
export type AuthDemo = 'hero' | 'case' | 'phone' | 'draft';
const HeroDemo = lazy(() => import('@/Components/home/HeroDemo').then((m) => ({ default: m.HeroDemo })));
const CaseDemo = lazy(() => import('@/Components/home/CaseDemo').then((m) => ({ default: m.CaseDemo })));
const DraftDemo = lazy(() => import('@/Components/home/DraftDemo').then((m) => ({ default: m.DraftDemo })));
const AutoPhone = lazy(() => import('@/Components/home/HearingPhone').then((m) => ({ default: function AutoPhone({ className }: { className?: string }) { return <m.HearingPhone progress={m.useAutoProgress(24)} className={className} />; } })));

/**
 * Sign-in / sign-up shell: promotional media on the left (desktop), form on the right.
 * The media (image or short muted video, heading, description) is set in Admin, Settings.
 * Video plays only on large screens, never with reduced motion or data saver, and always
 * has a still poster; without uploads it shows a real product screenshot.
 */
export default function AuthLayout({ title, description, children, wide, demo = 'hero' }: { title: string; description?: string; children: ReactNode; wide?: boolean; demo?: AuthDemo }) {
    const t = useT();
    const { authMedia, errors } = usePage<SharedProps & { errors?: Record<string, string> }>().props;
    const media = authMedia ?? null;
    const showPanel = media?.enabled ?? true;
    const card = useAnimationControls();

    /** Each failed submit (a fresh errors bag from the server) shakes the card once. */
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            card.start(shake);
        }
    }, [errors, card]);

    return (
        <MotionConfig reducedMotion="user">
            <Head title={title}>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="flex min-h-dvh items-start bg-ivory dark:bg-navy-950">
                {showPanel && <MediaPanel media={media} demo={demo} />}
                <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
                    <header className="flex items-center justify-between px-4 py-4 sm:px-8">
                        <Link href={route('home')} className={cn(showPanel && 'lg:invisible')}>
                            <Logo />
                        </Link>
                        <div className="flex items-center gap-1 text-navy-700 dark:text-navy-200">
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>
                    </header>
                    <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-12 sm:items-center sm:px-8 sm:pt-0">
                        <motion.div key={title} className={cn('w-full', wide ? 'max-w-2xl' : 'max-w-md')} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
                            <div className="mb-6">
                                <h1 className="text-2xl font-semibold text-navy-900 sm:text-3xl dark:text-white">{title}</h1>
                                {description && <p className="mt-2 text-sm text-navy-600 dark:text-navy-400">{description}</p>}
                            </div>
                            <motion.div animate={card} className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card transition-shadow focus-within:shadow-lg sm:p-8 dark:border-navy-800 dark:bg-navy-900">{children}</motion.div>
                            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-navy-500"><LockKeyhole className="size-3.5" aria-hidden />{t('Your information is encrypted and kept confidential.')}</p>
                        </motion.div>
                    </main>
                </div>
            </div>
            <Flash />
        </MotionConfig>
    );
}

function MediaPanel({ media, demo }: { media: AuthMedia | null; demo: AuthDemo }) {
    const t = useT();
    const { locale } = useLocale();
    const reduceMotion = useReducedMotion();
    const [playVideo, setPlayVideo] = useState(false);
    const still = media?.poster_url ?? media?.image_url ?? media?.default_image ?? '/images/screens/dashboard.webp';
    const image = media?.image_url ?? media?.default_image ?? '/images/screens/dashboard.webp';
    const uploadedImage = Boolean(media?.image_url);
    const heading = (locale === 'ur' && media?.heading_ur) || media?.heading || t('Every hearing on record. Every date kept.');
    const body = (locale === 'ur' && media?.description_ur) || media?.description || '';

    useEffect(() => {
        if (media?.mode !== 'video' || !media.video_url || reduceMotion) return;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        const large = window.matchMedia('(min-width: 1024px)');
        const update = () => setPlayVideo(large.matches && !connection?.saveData);
        update();
        large.addEventListener('change', update);
        return () => large.removeEventListener('change', update);
    }, [media?.mode, media?.video_url, reduceMotion]);

    const points = [
        { icon: CalendarDays, text: t('Court diary and calendar that keep every date') },
        { icon: BellRing, text: t('Hearing reminders by email and WhatsApp') },
        { icon: BadgeCheck, text: t('Bar enrollment checked before a lawyer is verified') },
    ];

    return (
        <aside className="relative hidden w-[46%] max-w-3xl shrink-0 overflow-hidden bg-navy-950 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col" aria-label={t('About the platform')}>
            {playVideo && media?.video_url ? (
                <video className="absolute inset-0 size-full object-cover opacity-70" src={media.video_url} poster={still} autoPlay muted loop playsInline preload="metadata" aria-hidden />
            ) : uploadedImage || media?.mode === 'video' ? (
                <img src={media?.mode === 'video' ? still : image} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/30" aria-hidden />

            <div className="relative flex flex-1 flex-col p-10 xl:p-14">
                <Link href={route('home')} className="self-start"><Logo inverted /></Link>

                {!uploadedImage && media?.mode !== 'video' && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className={cn('mt-8', demo === 'phone' && 'flex justify-center pt-6')}
                    >
                        <Suspense fallback={<div className={cn('animate-pulse rounded-xl bg-white/10', demo === 'phone' ? 'h-[min(58vh,600px)] w-[min(27vh,280px)]' : 'h-[24rem] xl:h-[28rem]')} />}>
                            {demo === 'hero' && <HeroDemo className="h-[24rem] sm:h-[24rem] xl:h-[28rem]" />}
                            {demo === 'case' && <CaseDemo className="h-[24rem] sm:h-[24rem] xl:h-[28rem]" />}
                            {demo === 'draft' && <DraftDemo className="h-[24rem] sm:h-[24rem] xl:h-[28rem]" />}
                            {demo === 'phone' && <AutoPhone className="h-[min(58vh,600px)]" />}
                        </Suspense>
                    </motion.div>
                )}

                <div className="mt-auto pt-10">
                    <h2 className="max-w-lg font-serif text-3xl leading-tight font-semibold xl:text-4xl">{heading}</h2>
                    {body && <p className="mt-3 max-w-md text-base text-navy-200">{body}</p>}
                    <ul className="mt-6 space-y-2.5">
                        {points.map((point, i) => (
                            <motion.li key={point.text} initial={reduceMotion ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.1, duration: 0.4 }} className="flex items-center gap-2.5 text-sm text-navy-100">
                                <point.icon className="size-4 shrink-0 text-gold-300" aria-hidden />
                                {point.text}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </aside>
    );
}
