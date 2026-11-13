import { router } from '@inertiajs/react';
import { Briefcase, Building2, Mail, Phone, Plus, Sparkles, UserCheck, UserRound, Users } from 'lucide-react';
import { Badge, Card, DataTable, LinkButton, PageHeader, Select, Stat, UserCell } from '@/Components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = { id: number; name: string; avatar_url: string | null; type: string; company_name: string | null; phone: string | null; email: string | null; city: string | null; cases_count: number; has_portal: boolean };

type Kpis = { total: number; individual: number; business: number; portal: number; active: number; new_this_month: number };

export default function ClientsIndex({ clients, kpis, filters }: { clients: Paginated<Row>; kpis: Kpis; filters: Record<string, string> }) {
    const t = useT();
    const { can } = usePermissions();
    return (
        <AppLayout title={t('Clients')} wide>
            <PageHeader title={t('Clients')} description={t('Everyone you represent, with their cases and contact details.')} actions={can('clients.create') && <LinkButton href={route('clients.create')} icon={<Plus className="size-4" />}>{t('New client')}</LinkButton>} />
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat label={t('All clients')} value={kpis.total} icon={<Users />} />
                <Stat label={t('Individuals')} value={kpis.individual} icon={<UserRound />} />
                <Stat label={t('Businesses')} value={kpis.business} icon={<Building2 />} />
                <Stat label={t('With open cases')} value={kpis.active} icon={<Briefcase />} tone="gold" />
                <Stat label={t('Portal access')} value={kpis.portal} icon={<UserCheck />} tone="green" />
                <Stat label={t('New this month')} value={kpis.new_this_month} icon={<Sparkles />} />
            </div>
            <Card>
                <DataTable
                    rows={clients}
                    filters={filters}
                    searchPlaceholder={t('Search name, phone or email…')}
                    rowHref={(row) => route('clients.show', row.id)}
                    toolbar={
                        <Select
                            aria-label={t('Type')}
                            value={filters.type ?? ''}
                            onChange={(e) => router.get(route('clients.index'), { ...filters, type: e.target.value || undefined }, { preserveState: true, replace: true })}
                            options={[{ value: 'individual', label: t('Individual') }, { value: 'business', label: t('Business') }]}
                            placeholder={t('All types')}
                            wrapperClassName="w-40"
                        />
                    }
                    columns={[
                        { key: 'name', label: t('Name'), sortable: true, render: (r) => <UserCell name={r.name} avatar={r.avatar_url} subtitle={r.company_name} /> },
                        { key: 'email', label: t('Email'), render: (r) => (r.email ? <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex max-w-[16rem] items-center gap-1.5 truncate text-navy-700 hover:underline dark:text-navy-200"><Mail className="size-3.5 shrink-0 text-navy-400" /><span className="truncate" dir="ltr">{r.email}</span></a> : <span className="text-navy-400">—</span>) },
                        { key: 'phone', label: t('Phone'), render: (r) => (r.phone ? <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="ltr-nums inline-flex items-center gap-1.5 hover:underline"><Phone className="size-3.5 text-navy-400" />{r.phone}</a> : <span className="text-navy-400">—</span>) },
                        { key: 'city', label: t('City'), hideOnMobile: true, render: (r) => r.city ?? '—' },
                        { key: 'cases_count', label: t('Cases'), render: (r) => r.cases_count },
                        { key: 'has_portal', label: t('Portal'), hideOnMobile: true, render: (r) => (r.has_portal ? <Badge tone="green" icon={<UserCheck className="size-3" />}>{t('Active')}</Badge> : <span className="text-navy-400">—</span>) },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
