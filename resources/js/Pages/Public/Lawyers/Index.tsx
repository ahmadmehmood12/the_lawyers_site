import { router } from '@inertiajs/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { LawyerCard, type LawyerCardData } from '@/Components/domain/LawyerCard';
import { Button, Checkbox, EmptyState, Input, Pagination, Select } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Props = { lawyers: Paginated<LawyerCardData>; filters: Record<string, string>; options: { cities: SelectOption[]; provinces: SelectOption[]; districts: SelectOption[]; courts: SelectOption[]; specializations: SelectOption[]; barCouncils: SelectOption[]; categories: Option[]; languages: string[] }; canonical: string };

export default function LawyersIndex({ lawyers, filters, options, canonical }: Props) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const visit = (patch: Record<string, string | undefined>) => router.get(route('lawyers.index'), Object.fromEntries(Object.entries({ ...filters, ...patch, page: undefined }).filter(([, v]) => v)), { preserveState: true, preserveScroll: true, replace: true });
    const spec = options.specializations.find((s) => s.slug === filters.specialization);
    const city = options.cities.find((c) => c.slug === filters.city);
    const heading = [spec?.label, city ? t('in :city', { city: city.label }) : null].filter(Boolean).join(' ') || t('Lawyers in Pakistan');

    const panel = (
        <div className="space-y-4">
            <Input label={t('Name or keyword')} defaultValue={filters.search ?? ''} onBlur={(e) => visit({ search: e.target.value || undefined })} onKeyDown={(e) => e.key === 'Enter' && visit({ search: (e.target as HTMLInputElement).value || undefined })} />
            <Select label={t('Practice area')} value={filters.specialization ?? ''} onChange={(e) => visit({ specialization: e.target.value || undefined })} options={options.specializations.map((s) => ({ value: String(s.slug), label: s.label }))} placeholder={t('Any')} />
            <Select label={t('Province')} value={filters.province ?? ''} onChange={(e) => visit({ province: e.target.value || undefined, district: undefined })} options={options.provinces} placeholder={t('Any')} />
            <Select label={t('District')} value={filters.district ?? ''} onChange={(e) => visit({ district: e.target.value || undefined })} options={options.districts.filter((d) => !filters.province || String(d.province_id) === filters.province)} placeholder={t('Any')} />
            <Select label={t('City')} value={filters.city ?? ''} onChange={(e) => visit({ city: e.target.value || undefined })} options={options.cities.map((c) => ({ value: String(c.slug), label: c.label }))} placeholder={t('Any')} />
            <Select label={t('Court')} value={filters.court ?? ''} onChange={(e) => visit({ court: e.target.value || undefined })} options={options.courts} placeholder={t('Any')} />
            <Select label={t('Minimum experience')} value={filters.experience ?? ''} onChange={(e) => visit({ experience: e.target.value || undefined })} options={['2', '5', '10', '15', '20'].map((y) => ({ value: y, label: t(':count+ years', { count: y }) }))} placeholder={t('Any')} />
            <Select label={t('Bar Council')} value={filters.bar_council ?? ''} onChange={(e) => visit({ bar_council: e.target.value || undefined })} options={options.barCouncils} placeholder={t('Any')} />
            <Select label={t('Advocate category')} value={filters.category ?? ''} onChange={(e) => visit({ category: e.target.value || undefined })} options={options.categories} placeholder={t('Any')} />
            <Select label={t('Language')} value={filters.language ?? ''} onChange={(e) => visit({ language: e.target.value || undefined })} options={options.languages.map((l) => ({ value: l, label: t(l) }))} placeholder={t('Any')} />
            <Select label={t('Max. consultation fee')} value={filters.fee_max ?? ''} onChange={(e) => visit({ fee_max: e.target.value || undefined })} options={['2000', '5000', '10000', '25000'].map((f) => ({ value: f, label: `PKR ${Number(f).toLocaleString()}` }))} placeholder={t('Any')} />
            <Checkbox label={t('Online consultation')} checked={filters.online === '1'} onChange={(e) => visit({ online: e.target.checked ? '1' : undefined })} />
            <Checkbox label={t('Verified only')} checked={filters.verified === '1'} onChange={(e) => visit({ verified: e.target.checked ? '1' : undefined })} />
            {Object.keys(filters).length > 0 && <Button variant="ghost" size="sm" onClick={() => router.get(route('lawyers.index'))}>{t('Clear filters')}</Button>}
        </div>
    );

    return (
        <PublicLayout seo={{ title: heading, description: t('Search advocates by city, court, practice area, experience and Bar Council. Verified credentials are clearly marked.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-2 text-xs text-navy-500"><a href={route('home')}>{t('Home')}</a> / {t('Find a Lawyer')}</nav>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div><h1 className="text-3xl font-semibold">{heading}</h1><p className="text-sm text-navy-600 dark:text-navy-300">{t(':count lawyers found', { count: lawyers.total })}</p></div>
                    <div className="flex items-center gap-2">
                        <Select aria-label={t('Sort')} value={filters.sort ?? ''} onChange={(e) => visit({ sort: e.target.value || undefined })} options={[{ value: '', label: t('Best match') }, { value: 'experience', label: t('Most experienced') }, { value: 'rating', label: t('Highest rated') }]} wrapperClassName="w-44" />
                        <Button variant="secondary" className="lg:hidden" icon={<SlidersHorizontal className="size-4" />} onClick={() => setOpen(true)}>{t('Filters')}</Button>
                    </div>
                </div>
                <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
                    <aside className="hidden lg:block">{panel}</aside>
                    <div>
                        {lawyers.data.length === 0 ? <EmptyState title={t('No lawyers match these filters')} description={t('Try widening your search.')} /> : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{lawyers.data.map((l) => <LawyerCard key={l.slug} lawyer={l} />)}</div>
                        )}
                        <div className="mt-6"><Pagination meta={lawyers} /></div>
                        <p className="mt-6 text-xs text-navy-500">{t('Listing order is not a ranking of competence. “Verified” means Bar enrollment evidence was reviewed by our team; other details are reported by the lawyer.')}</p>
                    </div>
                </div>
            </div>
            <div className={cn('fixed inset-0 z-50 lg:hidden', !open && 'hidden')}>
                <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
                <div className="absolute inset-y-0 end-0 w-80 max-w-[90vw] overflow-y-auto bg-white p-5 dark:bg-navy-900">
                    <div className="mb-4 flex items-center justify-between"><p className="font-semibold">{t('Filters')}</p><button type="button" onClick={() => setOpen(false)} aria-label={t('Close')}><X className="size-5" /></button></div>
                    {panel}
                </div>
            </div>
        </PublicLayout>
    );
}
