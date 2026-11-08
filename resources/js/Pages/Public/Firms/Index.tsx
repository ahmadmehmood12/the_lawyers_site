import { Link, router } from '@inertiajs/react';
import { Building2, Users } from 'lucide-react';
import { Card, EmptyState, Input, Pagination, Select } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Firm = { slug: string; name: string; city: string | null; logo_url: string | null; members: number | null; excerpt: string };

export default function FirmsIndex({ firms, filters, cities, canonical }: { firms: Paginated<Firm>; filters: Record<string, string>; cities: SelectOption[]; canonical: string }) {
    const t = useT();
    const visit = (p: Record<string, string | undefined>) => router.get(route('firms.index'), Object.fromEntries(Object.entries({ ...filters, ...p }).filter(([, v]) => v)), { preserveState: true, replace: true });
    return (
        <PublicLayout seo={{ title: t('Law firms in Pakistan'), description: t('Browse law firms by city and see their lawyers.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <h1 className="mb-6 text-3xl font-semibold">{t('Law firms')}</h1>
                <div className="mb-6 flex flex-wrap gap-3">
                    <Input aria-label={t('Search')} placeholder={t('Firm name')} defaultValue={filters.search ?? ''} onKeyDown={(e) => e.key === 'Enter' && visit({ search: (e.target as HTMLInputElement).value || undefined })} wrapperClassName="w-64" />
                    <Select aria-label={t('City')} value={filters.city ?? ''} onChange={(e) => visit({ city: e.target.value || undefined })} options={cities.map((c) => ({ value: String(c.slug), label: c.label }))} placeholder={t('Any city')} wrapperClassName="w-48" />
                </div>
                {firms.data.length === 0 ? <EmptyState icon={<Building2 className="size-5" />} title={t('No firms listed yet')} /> : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {firms.data.map((f) => (
                            <Link key={f.slug} href={route('firms.show', f.slug)}>
                                <Card className="h-full p-5 hover:border-navy-300">
                                    <div className="flex items-center gap-3">{f.logo_url ? <img src={f.logo_url} alt="" className="size-12 rounded object-cover" /> : <span className="flex size-12 items-center justify-center rounded bg-navy-900 text-gold-300"><Building2 className="size-6" /></span>}<div><p className="font-serif text-lg font-semibold">{f.name}</p><p className="text-xs text-navy-500">{f.city}{f.members ? `, ${t(':count members', { count: f.members })}` : ''}</p></div></div>
                                    {f.excerpt && <p className="mt-3 text-sm text-navy-600 dark:text-navy-300">{f.excerpt}</p>}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
                <div className="mt-6"><Pagination meta={firms} /></div>
            </div>
        </PublicLayout>
    );
}
