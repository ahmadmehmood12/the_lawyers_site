import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Building2, CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge } from '@/Components/ui';
import { useT } from '@/lib/i18n';

export type FirmCardData = {
    slug: string;
    name: string;
    city: string | null;
    logo_url: string | null;
    members: number | null;
    founded_year: number | null;
    excerpt: string;
    focus: string[];
};

export function FirmCard({ firm: f }: { firm: FirmCardData }) {
    const t = useT();
    const [logoFailed, setLogoFailed] = useState(false);
    return (
        <Link href={route('firms.show', f.slug)} className="group flex h-full flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card transition hover:border-navy-300 hover:shadow-pop dark:border-navy-800 dark:bg-navy-900">
            <div className="flex items-center gap-3">
                {f.logo_url && !logoFailed ? (
                    <img src={f.logo_url} alt="" loading="lazy" onError={() => setLogoFailed(true)} className="size-14 rounded-lg border border-navy-100 bg-white object-contain p-1 dark:border-navy-700" />
                ) : (
                    <span className="flex size-14 items-center justify-center rounded-lg bg-navy-900 font-serif text-xl font-semibold text-gold-300 dark:bg-navy-800">
                        {f.name.slice(0, 1)}
                    </span>
                )}
                <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-semibold text-navy-900 group-hover:underline dark:text-white">{f.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                        {f.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{f.city}</span>}
                        {f.founded_year && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />{t('Since :year', { year: f.founded_year })}</span>}
                    </p>
                </div>
            </div>

            {f.excerpt && <p className="mt-4 line-clamp-3 text-sm text-navy-600 dark:text-navy-300">{f.excerpt}</p>}

            {f.focus.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.focus.slice(0, 4).map((name) => <Badge key={name}>{name}</Badge>)}
                </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-navy-100 pt-3 text-xs dark:border-navy-800">
                <span className="inline-flex items-center gap-1.5 font-medium text-navy-700 dark:text-navy-200">
                    <Users className="size-3.5" aria-hidden />
                    {f.members ? t(':count advocates', { count: f.members }) : t('Advocate team')}
                </span>
                <span className="inline-flex items-center gap-1 text-navy-500">
                    <Building2 className="size-3.5" aria-hidden />
                    {t('View firm')}
                </span>
            </div>
        </Link>
    );
}
