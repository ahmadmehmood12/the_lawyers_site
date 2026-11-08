import { Link } from '@inertiajs/react';
import { BadgeCheck, Heart } from 'lucide-react';
import { Avatar, Card, EmptyState, LinkButton, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

export default function Favourites({ lawyers }: { lawyers: { slug: string; name: string; headline: string | null; city: string | null; verified: boolean; photo_url: string | null }[] }) {
    const t = useT();
    return (
        <AppLayout title={t('Favourites')} area="portal">
            <PageHeader title={t('Saved lawyers')} />
            {lawyers.length === 0 ? <Card><EmptyState icon={<Heart className="size-5" />} title={t('No saved lawyers')} action={<LinkButton href={route('lawyers.index')}>{t('Find a Lawyer')}</LinkButton>} /></Card> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lawyers.map((l) => (
                        <Link key={l.slug} href={route('lawyers.show', l.slug)}>
                            <Card className="flex items-center gap-3 p-4 hover:border-navy-300"><Avatar name={l.name} src={l.photo_url} size="lg" /><div className="min-w-0"><p className="flex items-center gap-1 font-semibold">{l.name}{l.verified && <BadgeCheck className="size-4 text-verdant-600" />}</p><p className="truncate text-xs text-navy-500">{l.headline}</p><p className="text-xs text-navy-500">{l.city}</p></div></Card>
                        </Link>
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
