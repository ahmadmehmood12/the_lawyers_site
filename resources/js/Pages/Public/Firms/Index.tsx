import { router } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { FirmCard, type FirmCardData } from '@/Components/domain/FirmCard';
import { EmptyState, Input, Pagination, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

export default function FirmsIndex({ firms, filters, cities, canonical, embedded = null }: { firms: Paginated<FirmCardData>; filters: Record<string, string>; cities: SelectOption[]; canonical: string; embedded?: 'portal' | 'workspace' | null }) {
    const t = useT();
    const indexRoute = embedded === 'portal' ? 'portal.firms.index' : 'firms.index';
    const showRoute = embedded === 'portal' ? 'portal.firms.show' : 'firms.show';
    const visit = (p: Record<string, string | undefined>) => router.get(route(indexRoute), Object.fromEntries(Object.entries({ ...filters, ...p }).filter(([, v]) => v)), { preserveState: true, replace: true });
    const heading = t('Law firms');
    const content = (
        <>
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-2 text-xs text-navy-500"><a href={route(embedded === 'portal' ? 'portal.dashboard' : 'home')}>{t(embedded === 'portal' ? 'Dashboard' : 'Home')}</a> / {t('Law firms')}</nav>
                <h1 className="mb-2 text-3xl font-semibold">{heading}</h1>
                <p className="mb-6 text-sm text-navy-600 dark:text-navy-300">{t('Full-service and specialist firms, with their advocate teams.')}</p>
                <div className="mb-6 flex flex-wrap gap-3">
                    <Input aria-label={t('Search')} placeholder={t('Firm name')} defaultValue={filters.search ?? ''} onKeyDown={(e) => e.key === 'Enter' && visit({ search: (e.target as HTMLInputElement).value || undefined })} wrapperClassName="w-64" />
                    <Select aria-label={t('City')} value={filters.city ?? ''} onChange={(e) => visit({ city: e.target.value || undefined })} options={cities.map((c) => ({ value: String(c.slug), label: c.label }))} placeholder={t('Any city')} wrapperClassName="w-48" />
                </div>
                {firms.data.length === 0 ? <EmptyState icon={<Building2 className="size-5" />} title={t('No firms listed yet')} /> : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {firms.data.map((f) => <FirmCard key={f.slug} firm={f} showRoute={showRoute} />)}
                    </div>
                )}
                <div className="mt-6"><Pagination meta={firms} /></div>
            </div>
        </>
    );

    if (embedded) {
        return <AppLayout area="portal" title={heading} wide>{content}</AppLayout>;
    }

    return (
        <PublicLayout seo={{ title: t('Law firms in Pakistan'), description: t('Browse law firms by city and see their lawyers.'), canonical }}>
            {content}
        </PublicLayout>
    );
}
