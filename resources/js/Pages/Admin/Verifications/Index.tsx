import { router } from '@inertiajs/react';
import { Card, DataTable, PageHeader, Select, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Row = { id: number; lawyer: string; email: string; bar_council: string | null; enrollment_number: string | null; status: string; status_label: string; documents: number; submitted_at: string | null; reviewer: string | null };

export default function VerificationsIndex({ requests, filters, statuses }: { requests: Paginated<Row>; filters: Record<string, string>; statuses: Option[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Verification')} area="admin" wide>
            <PageHeader title={t('Lawyer verification queue')} />
            <Card>
                <DataTable rows={requests} filters={filters} rowHref={(r) => route('admin.verifications.show', r.id)} searchPlaceholder={t('Name or enrollment no.')}
                    toolbar={<Select aria-label={t('Status')} wrapperClassName="w-48" value={filters.status ?? 'queue'} onChange={(e) => router.get(route('admin.verifications.index'), { ...filters, status: e.target.value }, { preserveState: true })} options={[{ value: 'queue', label: t('Needs review') }, { value: 'all', label: t('All') }, ...statuses]} />}
                    columns={[
                        { key: 'lawyer', label: t('Lawyer'), render: (r) => (<div><p className="font-medium">{r.lawyer}</p><p className="text-xs text-navy-500">{r.email}</p></div>) },
                        { key: 'enrollment', label: t('Enrollment'), render: (r) => <span className="text-xs">{r.bar_council}<br /><span className="ltr-nums">{r.enrollment_number}</span></span> },
                        { key: 'documents', label: t('Docs'), render: (r) => r.documents },
                        { key: 'submitted_at', label: t('Submitted'), hideOnMobile: true, render: (r) => (r.submitted_at ? formatDateTime(r.submitted_at, locale) : '—') },
                        { key: 'status', label: t('Status'), render: (r) => <StatusBadge value={r.status} label={r.status_label} /> },
                    ]} />
            </Card>
        </AppLayout>
    );
}
