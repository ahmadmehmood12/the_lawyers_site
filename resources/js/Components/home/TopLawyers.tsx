import { Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BadgeCheck, Briefcase, CalendarClock, MapPin, Star } from 'lucide-react';
import type { LawyerCardData } from '@/Components/domain/LawyerCard';
import { Avatar, LinkButton, Skeleton } from '@/Components/ui';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';
import { Reveal } from './Reveal';

export type TopLawyer = LawyerCardData & { cases_handled: number; cases_completed: number };
export type TopLawyersData = { mode: 'rated' | 'verified'; lawyers: TopLawyer[] };

/**
 * Homepage lawyers (HomepageShowcase::topLawyers). "rated" = ranked by a Bayesian average of
 * approved reviews (minimum 3 each). "verified" = not enough reviews yet, so the section does not
 * claim anyone is top rated and shows verified advocates instead.
 */
export function TopLawyers({ data }: { data: TopLawyersData | undefined }) {
    const t = useT();

    if (data && data.lawyers.length === 0) return null;

    return (
        <section className="border-t border-navy-100 py-20 lg:py-28 dark:border-navy-800" aria-labelledby="hm-top-lawyers">
            <div className="hm-wrap">
                <Reveal className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 id="hm-top-lawyers" className="text-4xl font-semibold sm:text-5xl">{data?.mode === 'rated' ? t('Top-rated advocates') : t('Verified advocates')}</h2>
                        <p className="mt-3 max-w-xl text-lg text-navy-600 dark:text-navy-300">
                            {data?.mode === 'rated' ? t('Ranked by client reviews, weighted so a handful of ratings cannot outrank a long record.') : t('Bar enrollment checked by our team. Ratings appear once clients review them.')}
                        </p>
                    </div>
                    <Link href={route('lawyers.index')} className="text-sm font-medium text-navy-800 underline underline-offset-4 hover:text-gold-700 dark:text-navy-100 dark:hover:text-gold-300">{t('Browse all lawyers')}</Link>
                </Reveal>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {data
                        ? data.lawyers.map((lawyer, i) => <Reveal key={lawyer.slug} delay={i * 0.08}><LawyerTile lawyer={lawyer} rank={data.mode === 'rated' ? i + 1 : null} /></Reveal>)
                        : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-80" />)}
                </div>
            </div>
        </section>
    );
}

/** Lawyer card shared by the homepage and the /lawyers directory. */
export function LawyerTile({ lawyer: l, rank }: { lawyer: TopLawyer; rank: number | null }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const isClient = auth.user?.account_type === 'client';
    const specialty = l.specializations[0]?.name ?? l.category_label;

    return (
        <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="flex h-full flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card dark:border-navy-800 dark:bg-navy-900">
            <div className="flex items-start justify-between gap-3">
                <Avatar name={l.name} src={l.photo_url} size="xl" />
                {rank && <span className="ltr-nums rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-700/30 dark:text-gold-200">#{rank}</span>}
            </div>
            <h3 className="mt-4 flex items-center gap-1.5 font-serif text-xl font-semibold text-navy-900 dark:text-white">
                <span className="min-w-0 truncate">{l.name}</span>
                {l.verified && <BadgeCheck className="size-5 shrink-0 text-verdant-600" aria-label={t('Verified')} />}
            </h3>
            <p className="mt-0.5 text-sm text-navy-600 dark:text-navy-300">{[l.category_label, specialty !== l.category_label ? specialty : null].filter(Boolean).join(', ')}</p>
            {l.city && <p className="mt-1 inline-flex items-center gap-1 text-sm text-navy-500"><MapPin className="size-3.5" />{l.city}</p>}

            <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-navy-100 py-3 text-center dark:border-navy-800">
                <div>
                    <dt className="text-[11px] text-navy-500">{t('Rating')}</dt>
                    <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold tabular-nums">
                        {l.rating ? <><Star className="size-3.5 fill-gold-400 text-gold-400" aria-hidden />{l.rating.toFixed(1)}</> : <span className="text-navy-400">—</span>}
                    </dd>
                </div>
                <div>
                    <dt className="text-[11px] text-navy-500">{t('Reviews')}</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(l.rating_count, locale)}</dd>
                </div>
                <div>
                    <dt className="text-[11px] text-navy-500">{t('Cases')}</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums" title={t(':count completed', { count: l.cases_completed })}>{formatNumber(l.cases_handled, locale)}</dd>
                </div>
            </dl>

            <ul className="mt-3 space-y-1 text-xs text-navy-600 dark:text-navy-300">
                {l.years_experience !== null && <li className="inline-flex items-center gap-1.5"><Briefcase className="size-3.5" />{t(':count years in practice', { count: l.years_experience })}</li>}
                {l.courts[0] && <li className="truncate">{l.courts.slice(0, 2).join(', ')}</li>}
            </ul>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <LinkButton href={route('lawyers.show', l.slug)} variant="secondary" size="sm">{t('View profile')}</LinkButton>
                {l.accepting_clients && (isClient
                    ? <LinkButton href={route('portal.book', l.slug)} size="sm" icon={<CalendarClock className="size-3.5" />}>{t('Book appointment')}</LinkButton>
                    : !auth.user && <LinkButton href={route('register', { type: 'client' })} size="sm" icon={<CalendarClock className="size-3.5" />}>{t('Sign up to book')}</LinkButton>)}
            </div>
        </motion.article>
    );
}
