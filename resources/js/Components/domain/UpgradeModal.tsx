import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Crown, Infinity as InfinityIcon, Lock, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

/** Built by SubscriptionService::upgradeOffer(). */
export type UpgradeOffer = {
    feature: string;
    feature_label: string;
    limit: number | null;
    used: number | null;
    message: string;
    current: { slug: string; name: string } | null;
    next: { slug: string; name: string; description: string | null; price_monthly: number; price_yearly: number; trial_days: number; url: string } | null;
    rows: { key: string; label: string; current: number | null; next: number | null; highlight: boolean }[];
    plans_url: string;
};

/** Opens the Upgrade modal from anywhere (used by JSON endpoints such as the AI assistant). */
export function openUpgrade(offer: UpgradeOffer) {
    window.dispatchEvent(new CustomEvent<UpgradeOffer>('plan-upgrade', { detail: offer }));
}

/**
 * Shown when an action passes the plan (PlanLimitReached → `upgrade` flash, or openUpgrade()).
 * Explains the limit, compares the current plan with the next one and links to Billing with it chosen.
 */
export function UpgradeModal() {
    const t = useT();
    const { locale } = useLocale();
    const { flash } = usePage<SharedProps>().props;
    const [offer, setOffer] = useState<UpgradeOffer | null>(null);
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        if (flash.upgrade) setOffer(flash.upgrade);
    }, [flash.upgrade]);

    useEffect(() => {
        const listener = (event: Event) => setOffer((event as CustomEvent<UpgradeOffer>).detail);
        window.addEventListener('plan-upgrade', listener);
        return () => window.removeEventListener('plan-upgrade', listener);
    }, []);

    useEffect(() => {
        if (!offer) return;
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOffer(null);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [offer]);

    const next = offer?.next ?? null;
    const price = next ? (cycle === 'yearly' ? next.price_yearly : next.price_monthly) : 0;
    const saving = next && next.price_yearly > 0 ? Math.max(0, Math.round((1 - next.price_yearly / (next.price_monthly * 12)) * 100)) : 0;
    const value = (n: number | null, key: string) => {
        if (n === 0) return <span className="inline-flex items-center gap-1 text-navy-400"><Lock className="size-3.5" />{t('Not included')}</span>;
        if (key === 'analytics' || key === 'client_portal' || key === 'drafting_templates') return <span className="inline-flex items-center gap-1"><Check className="size-4 text-verdant-600" />{t('Included')}</span>;
        if (n === null) return <span className="inline-flex items-center gap-1"><InfinityIcon className="size-4" />{t('Unlimited')}</span>;
        if (key === 'storage_mb') return n >= 1000 ? `${formatNumber(Math.round(n / 1000), locale)} GB` : `${formatNumber(n, locale)} MB`;
        return formatNumber(n, locale);
    };

    return (
        <AnimatePresence>
            {offer && (
                <motion.div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOffer(null)} aria-hidden />
                    <motion.div role="dialog" aria-modal="true" aria-labelledby="upgrade-title"
                        initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-navy-900">
                        {/* Header */}
                        <div className="relative overflow-hidden bg-navy-900 px-6 pb-8 pt-7 text-white sm:px-8">
                            <motion.div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gold-500/25 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
                            <motion.div className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-gold-300/10 blur-3xl" animate={{ x: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 7 }} />
                            <button type="button" onClick={() => setOffer(null)} aria-label={t('Close')} className="absolute end-4 top-4 rounded-full p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
                            <motion.span initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="relative grid size-12 place-items-center rounded-2xl bg-gold-500 text-navy-950 shadow-lg">
                                <Crown className="size-6" />
                            </motion.span>
                            <h2 id="upgrade-title" className="relative mt-4 font-serif text-2xl font-semibold sm:text-3xl">
                                {next ? t('Upgrade to :plan', { plan: next.name }) : t('You have reached your plan’s limit')}
                            </h2>
                            <p className="relative mt-2 max-w-lg text-navy-200">{offer.message} {next ? t('Upgrade to keep going without losing anything you have already added.') : t('Contact us and we will set up a plan that fits.')}</p>
                            {offer.limit !== null && offer.limit > 0 && (
                                <div className="relative mt-5 max-w-sm">
                                    <div className="mb-1.5 flex justify-between text-xs text-navy-200"><span>{offer.feature_label}</span><span className="tabular-nums">{formatNumber(offer.used ?? offer.limit, locale)} / {formatNumber(offer.limit, locale)}</span></div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-red-400" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.9, delay: 0.2 }} /></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 px-6 py-6 sm:px-8">
                            {next && (
                                <>
                                    <div className="flex flex-wrap items-end justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-navy-500">{t('Next plan')}</p>
                                            <p className="flex items-baseline gap-1.5">
                                                <motion.span key={cycle} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-serif text-4xl font-semibold text-navy-900 dark:text-white">{formatMoney(price, locale)}</motion.span>
                                                <span className="text-navy-500">/ {cycle === 'yearly' ? t('year') : t('month')}</span>
                                            </p>
                                            {next.trial_days > 0 && <p className="mt-1 text-sm text-verdant-700 dark:text-verdant-300">{t(':days day free trial included', { days: next.trial_days })}</p>}
                                        </div>
                                        {next.price_yearly > 0 && (
                                            <div className="flex rounded-full bg-navy-50 p-1 text-sm dark:bg-navy-800" role="radiogroup">
                                                {(['monthly', 'yearly'] as const).map((c) => (
                                                    <button key={c} type="button" role="radio" aria-checked={cycle === c} onClick={() => setCycle(c)} className={cn('relative rounded-full px-4 py-1.5 font-medium', cycle === c ? 'text-white dark:text-navy-950' : 'text-navy-600 dark:text-navy-300')}>
                                                        {cycle === c && <motion.span layoutId="upgrade-cycle" className="absolute inset-0 rounded-full bg-navy-900 dark:bg-gold-400" />}
                                                        <span className="relative">{c === 'monthly' ? t('Monthly') : t('Yearly')}{c === 'yearly' && saving > 0 && <span className="ms-1.5 rounded-full bg-gold-400 px-1.5 text-[10px] text-navy-950">−{saving}%</span>}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-navy-100 dark:border-navy-800">
                                        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] bg-navy-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-navy-500 dark:bg-navy-800/60">
                                            <span>{t('Feature')}</span><span>{offer.current?.name ?? t('Current')}</span><span className="text-gold-700 dark:text-gold-300">{next.name}</span>
                                        </div>
                                        {offer.rows.map((row, i) => (
                                            <motion.div key={row.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                                                className={cn('grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center border-t border-navy-100 px-4 py-2.5 text-sm dark:border-navy-800', row.highlight && 'bg-gold-50 dark:bg-gold-500/10')}>
                                                <span className={cn('font-medium', row.highlight && 'text-gold-700 dark:text-gold-300')}>{row.label}</span>
                                                <span className="text-navy-600 dark:text-navy-300">{value(row.current, row.key)}</span>
                                                <span className="font-semibold text-navy-900 dark:text-white">{value(row.next, row.key)}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button type="button" onClick={() => setOffer(null)} className="text-sm font-medium text-navy-600 hover:underline dark:text-navy-300">{t('Maybe later')}</button>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Link href={offer.plans_url} onClick={() => setOffer(null)} className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium ring-1 ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800">{t('Compare all plans')}</Link>
                                    {next && (
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Link href={`${next.url}${next.url.includes('?') ? '&' : '?'}cycle=${cycle}`} onClick={() => setOffer(null)}
                                                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/30 hover:bg-gold-400">
                                                <motion.span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-12 bg-white/40" animate={{ left: ['-50%', '150%'] }} transition={{ repeat: Infinity, duration: 2.4, repeatDelay: 1 }} />
                                                <Sparkles className="size-4" />{t('Upgrade for :price', { price: `${formatMoney(price, locale)} / ${cycle === 'yearly' ? t('year') : t('month')}` })}
                                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
