import { Link } from '@inertiajs/react';
import { BadgeCheck, MapPin, Star, Video } from 'lucide-react';
import { Avatar, Badge } from '@/Components/ui';
import { formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export type LawyerCardData = { slug: string; name: string; headline: string | null; photo_url: string | null; city: string | null; specializations: { slug: string; name: string }[]; category_label: string | null; years_experience: number | null; fee_min: number | null; offers_online: boolean; verified: boolean; rating: number | null; rating_count: number; accepting_clients: boolean };

export function LawyerCard({ lawyer: l }: { lawyer: LawyerCardData }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <Link href={route('lawyers.show', l.slug)} className="group flex flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card transition hover:border-navy-300 hover:shadow-pop dark:border-navy-800 dark:bg-navy-900">
            <div className="flex gap-4">
                <Avatar name={l.name} src={l.photo_url} size="lg" />
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-serif text-lg font-semibold text-navy-900 group-hover:underline dark:text-white">
                        {l.name}
                        {l.verified && <BadgeCheck className="size-5 shrink-0 text-verdant-600" aria-label={t('Verified')} />}
                    </p>
                    {l.headline && <p className="line-clamp-2 text-sm text-navy-600 dark:text-navy-300">{l.headline}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-navy-500">
                        {l.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{l.city}</span>}
                        {l.years_experience !== null && <span>{t(':count years', { count: l.years_experience })}</span>}
                        {l.rating !== null && <span className="inline-flex items-center gap-0.5"><Star className="size-3 fill-gold-400 text-gold-400" />{l.rating.toFixed(1)} ({l.rating_count})</span>}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
                {l.specializations.slice(0, 3).map((s) => <Badge key={s.slug}>{s.name}</Badge>)}
                {l.category_label && <Badge tone="navy">{l.category_label}</Badge>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-navy-500">
                <span>{l.fee_min ? t('From :fee', { fee: formatMoney(l.fee_min, locale) }) : t('Fee on request')}</span>
                <span className="flex items-center gap-2">{l.offers_online && <span className="inline-flex items-center gap-1"><Video className="size-3.5" />{t('Online')}</span>}{!l.accepting_clients && <Badge tone="amber">{t('Not accepting')}</Badge>}</span>
            </div>
        </Link>
    );
}
