import { Briefcase, FileSignature, Scale, Users } from 'lucide-react';
import { Skeleton } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { AnimatedCounter } from './AnimatedCounter';
import { Reveal } from './Reveal';

export type ShowcaseStats = { lawyers: number; clients: number; drafts: number; cases: number };

/**
 * Real platform totals from the database (HomepageShowcase::stats). Zero counts are left out,
 * and the strip disappears entirely on an empty database rather than showing made-up numbers.
 */
export function StatsStrip({ stats }: { stats: ShowcaseStats | undefined }) {
    const t = useT();
    const items = [
        { key: 'lawyers', label: t('Lawyers on the platform'), icon: Scale, value: stats?.lawyers ?? 0 },
        { key: 'clients', label: t('Clients served'), icon: Users, value: stats?.clients ?? 0 },
        { key: 'cases', label: t('Cases managed'), icon: Briefcase, value: stats?.cases ?? 0 },
        { key: 'drafts', label: t('Legal drafts prepared'), icon: FileSignature, value: stats?.drafts ?? 0 },
    ];

    if (stats && items.every((i) => i.value === 0)) return null;

    return (
        <section className="border-y border-navy-100 bg-navy-950 py-12 text-white sm:py-16 dark:border-navy-800" aria-label={t('Platform statistics')}>
            <div className="hm-wrap">
                <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
                    {items.filter((i) => !stats || i.value > 0).map((item, index) => (
                        <Reveal key={item.key} delay={index * 0.08} className="flex flex-col items-center px-4 text-center">
                            <item.icon className="size-5 text-gold-300" aria-hidden />
                            <dd className="mt-3 font-serif text-4xl font-semibold tabular-nums sm:text-5xl">
                                {stats ? <AnimatedCounter value={item.value} /> : <Skeleton className="mx-auto h-10 w-24 bg-white/10" />}
                            </dd>
                            <dt className="mt-1 text-sm text-navy-200">{item.label}</dt>
                        </Reveal>
                    ))}
                </dl>
            </div>
        </section>
    );
}
