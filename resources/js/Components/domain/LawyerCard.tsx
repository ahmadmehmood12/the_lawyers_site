import { Link } from '@inertiajs/react';
import { BadgeCheck, Building2, GraduationCap, Landmark, Languages, MapPin, Scale, Star, Video } from 'lucide-react';
import { Avatar, Badge } from '@/Components/ui';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export type LawyerCardData = {
    slug: string;
    name: string;
    headline: string | null;
    photo_url: string | null;
    city: string | null;
    specializations: { slug: string; name: string }[];
    category_label: string | null;
    years_experience: number | null;
    fee_min: number | null;
    offers_online: boolean;
    offers_in_person: boolean;
    accepting_clients: boolean;
    verified: boolean;
    rating: number | null;
    rating_count: number;
    bar_council: string | null;
    languages: string[];
    degree: { degree: string; institution: string; year: number | null } | null;
    courts: string[];
    firm: { name: string; slug: string } | null;
};

export function LawyerCard({ lawyer: l }: { lawyer: LawyerCardData }) {
    const t = useT();
    const { locale } = useLocale();
    const availability = !l.accepting_clients ? t('Not accepting new clients') : l.offers_online && l.offers_in_person ? t('Online & in person') : l.offers_online ? t('Online consultation') : t('In-person consultation');

    return (
        <Link href={route('lawyers.show', l.slug)} className="group flex h-full flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card transition hover:border-navy-300 hover:shadow-pop dark:border-navy-800 dark:bg-navy-900">
            <div className="flex gap-4">
                <Avatar name={l.name} src={l.photo_url} size="lg" />
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-serif text-lg font-semibold text-navy-900 group-hover:underline dark:text-white">
                        <span className="truncate">{l.name}</span>
                        {l.verified && <BadgeCheck className="size-5 shrink-0 text-verdant-600" aria-label={t('Verified')} />}
                    </p>
                    {l.headline && <p className="line-clamp-2 text-sm text-navy-600 dark:text-navy-300">{l.headline}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                        {l.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{l.city}</span>}
                        {l.years_experience !== null && <span>{t(':count years', { count: l.years_experience })}</span>}
                        {l.rating !== null && <span className="inline-flex items-center gap-0.5"><Star className="size-3 fill-gold-400 text-gold-400" />{l.rating.toFixed(1)} ({l.rating_count})</span>}
                    </p>
                </div>
            </div>

            <dl className="mt-4 grid gap-2 rounded-lg bg-navy-50/70 p-3 text-xs dark:bg-navy-800/60">
                {l.degree && (
                    <div className="flex items-start gap-2">
                        <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-navy-400" aria-hidden />
                        <div className="min-w-0">
                            <dt className="sr-only">{t('Education')}</dt>
                            <dd className="truncate font-medium text-navy-800 dark:text-navy-100">{l.degree.degree}</dd>
                            <dd className="truncate text-navy-500">{l.degree.institution}{l.degree.year ? ` · ${l.degree.year}` : ''}</dd>
                        </div>
                    </div>
                )}
                {(l.bar_council || l.category_label) && (
                    <div className="flex items-start gap-2">
                        <Landmark className="mt-0.5 size-3.5 shrink-0 text-navy-400" aria-hidden />
                        <div className="min-w-0">
                            <dt className="sr-only">{t('Bar Council')}</dt>
                            <dd className="truncate font-medium text-navy-800 dark:text-navy-100">{l.bar_council ?? l.category_label}</dd>
                            {l.bar_council && l.category_label && <dd className="truncate text-navy-500">{l.category_label}</dd>}
                        </div>
                    </div>
                )}
                {l.firm && (
                    <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 size-3.5 shrink-0 text-navy-400" aria-hidden />
                        <div className="min-w-0">
                            <dt className="sr-only">{t('Law firm')}</dt>
                            <dd className="truncate font-medium text-navy-800 dark:text-navy-100">{l.firm.name}</dd>
                        </div>
                    </div>
                )}
                {l.languages.length > 0 && (
                    <div className="flex items-start gap-2">
                        <Languages className="mt-0.5 size-3.5 shrink-0 text-navy-400" aria-hidden />
                        <div className="min-w-0">
                            <dt className="sr-only">{t('Languages')}</dt>
                            <dd className="truncate text-navy-600 dark:text-navy-300">{l.languages.slice(0, 4).join(' · ')}</dd>
                        </div>
                    </div>
                )}
            </dl>

            {l.specializations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {l.specializations.slice(0, 3).map((s) => <Badge key={s.slug}>{s.name}</Badge>)}
                </div>
            )}

            {l.courts.length > 0 && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-navy-500">
                    <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span className="line-clamp-2">{l.courts.slice(0, 3).join(' · ')}</span>
                </p>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-3 text-xs dark:border-navy-800">
                <span className="font-medium text-navy-700 dark:text-navy-200">{l.fee_min ? t('From :fee', { fee: formatMoney(l.fee_min, locale) }) : t('Fee on request')}</span>
                <span className="flex items-center gap-2">
                    {l.offers_online && <span className="inline-flex items-center gap-1 text-navy-500"><Video className="size-3.5" />{t('Online')}</span>}
                    <Badge tone={l.accepting_clients ? 'green' : 'amber'}>{availability}</Badge>
                </span>
            </div>
        </Link>
    );
}
