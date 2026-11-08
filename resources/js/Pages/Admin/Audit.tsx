import { router } from '@inertiajs/react';
import { Card, DataTable, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

export default function Audit({ activities, logs, filters }: { activities: Paginated<any>; logs: string[]; filters: Record<string, string> }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Audit Log')} area="admin" wide>
            <PageHeader title={t('Audit log')} description={t('Every action on the platform in plain words. Firm records are named by reference only, never by their content.')} />
            <Card>
                <DataTable rows={activities} filters={filters}
                    toolbar={<Select aria-label={t('Log')} wrapperClassName="w-40" value={filters.log ?? ''} onChange={(e) => router.get(route('admin.audit.index'), { ...filters, log: e.target.value || undefined }, { preserveState: true })} options={logs.map((l) => ({ value: l, label: l }))} placeholder={t('All logs')} />}
                    columns={[
                        { key: 'created_at', label: t('When'), render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.created_at, locale)}</span> },
                        { key: 'description', label: t('What happened'), render: (r) => (<div className="max-w-xl"><p className="text-sm">{r.sentence}</p><p className="text-xs text-navy-500">{[r.organization, r.log, r.subject].filter(Boolean).join(', ')}</p></div>) },
                        { key: 'properties', label: t('Details'), hideOnMobile: true, render: (r) => <code className="text-[11px] break-all">{JSON.stringify(r.properties)}</code> },
                    ]} />
            </Card>
        </AppLayout>
    );
}
