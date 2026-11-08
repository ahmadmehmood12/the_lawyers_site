import { router } from '@inertiajs/react';
import { Badge, Card, DataTable, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Row = { id: number; name: string; type: string; type_label: string; status: string; owner: string; owner_email: string; members: number; cases: number; clients: number; plan: string | null; plan_ends_at: string | null; created_at: string };

export default function Organizations({ organizations, filters, plans, canManage }: { organizations: Paginated<Row>; filters: Record<string, string>; plans: SelectOption[]; canManage: boolean }) {
    const t = useT();
    return (
        <AppLayout title={t('Organizations')} area="admin" wide>
            <PageHeader title={t('Organizations')} description={t('Counts only — case content is never visible to platform staff.')} />
            <Card>
                <DataTable rows={organizations} filters={filters}
                    toolbar={<Select aria-label={t('Type')} wrapperClassName="w-40" value={filters.type ?? ''} onChange={(e) => router.get(route('admin.organizations.index'), { ...filters, type: e.target.value || undefined }, { preserveState: true })} options={[{ value: 'solo', label: t('Individual practice') }, { value: 'firm', label: t('Law firm') }]} placeholder={t('All')} />}
                    columns={[
                        { key: 'name', label: t('Organization'), render: (r) => (<div><p className="font-medium">{r.name} {r.status !== 'active' && <Badge tone="red">{r.status}</Badge>}</p><p className="text-xs text-navy-500">{r.type_label}, {r.owner} ({r.owner_email})</p></div>) },
                        { key: 'counts', label: t('Members / cases / clients'), render: (r) => `${r.members} / ${r.cases} / ${r.clients}` },
                        { key: 'plan', label: t('Plan'), render: (r) => canManage ? <Select aria-label={t('Plan')} value={plans.find((p) => p.label === r.plan)?.value as string ?? ''} onChange={(e) => router.put(route('admin.organizations.plan', r.id), { plan: e.target.value, cycle: 'monthly' }, { preserveScroll: true })} options={plans} wrapperClassName="w-36" /> : (r.plan ?? '—') },
                        { key: 'status', label: '', render: (r) => canManage && <button type="button" className="text-xs underline" onClick={() => router.put(route('admin.organizations.status', r.id), { status: r.status === 'active' ? 'suspended' : 'active' }, { preserveScroll: true })}>{r.status === 'active' ? t('Suspend') : t('Reactivate')}</button> },
                    ]} />
            </Card>
        </AppLayout>
    );
}
