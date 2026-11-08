import { router } from '@inertiajs/react';
import { Plus, UserCheck } from 'lucide-react';
import { Badge, Card, DataTable, LinkButton, PageHeader, Select } from '@/Components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = { id: number; name: string; type: string; company_name: string | null; phone: string | null; email: string | null; city: string | null; cases_count: number; has_portal: boolean };

export default function ClientsIndex({ clients, filters }: { clients: Paginated<Row>; filters: Record<string, string> }) {
    const t = useT();
    const { can } = usePermissions();
    return (
        <AppLayout title={t('Clients')}>
            <PageHeader title={t('Clients')} description={t('Everyone you represent, with their cases and contact details.')} actions={can('clients.create') && <LinkButton href={route('clients.create')} icon={<Plus className="size-4" />}>{t('New client')}</LinkButton>} />
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
                        { key: 'name', label: t('Name'), sortable: true, render: (r) => (<div><p className="font-medium">{r.name}</p>{r.company_name && <p className="text-xs text-navy-500">{r.company_name}</p>}</div>) },
                        { key: 'phone', label: t('Phone'), render: (r) => <span className="ltr-nums">{r.phone ?? '—'}</span> },
                        { key: 'city', label: t('City'), hideOnMobile: true, render: (r) => r.city ?? '—' },
                        { key: 'cases_count', label: t('Cases'), render: (r) => r.cases_count },
                        { key: 'has_portal', label: t('Portal'), hideOnMobile: true, render: (r) => (r.has_portal ? <Badge tone="green" icon={<UserCheck className="size-3" />}>{t('Active')}</Badge> : <span className="text-navy-400">—</span>) },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
