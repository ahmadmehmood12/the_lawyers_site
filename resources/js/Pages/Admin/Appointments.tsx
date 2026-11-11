import { router } from '@inertiajs/react';
import { History } from 'lucide-react';
import { Card, DataTable, PageHeader, Select, Stat, StatusBadge, UserCell } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Row = { id: number; starts_at: string; lawyer: string; lawyer_avatar: string | null; organization: string | null; client: string; mode: string; kind: string; status: string; status_label: string; rescheduled: boolean };

const countTones: Record<string, 'navy' | 'green' | 'gold' | 'red'> = { requested: 'gold', confirmed: 'green', completed: 'green', cancelled: 'red', declined: 'red', no_show: 'red' };

/** Admin, Appointments: platform-wide view of consultations (who, when, status). Notes and messages stay private. */
export default function Appointments({ rows, filters, statuses, counts }: { rows: Paginated<Row>; filters: Record<string, string>; statuses: Option[]; counts: Record<string, number> }) {
    const t = useT();
    const { locale } = useLocale();
    const visit = (p: Record<string, string | undefined>) => router.get(route('admin.appointments.index'), { ...filters, ...p, page: undefined }, { preserveState: true, replace: true });
    return (
        <AppLayout title={t('Appointments')} area="admin" wide>
            <PageHeader title={t('Appointments')} description={t('Consultations booked across the platform. Client messages and lawyer notes are not shown.')} />
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {statuses.map((s) => <Stat key={s.value} label={s.label} value={counts[s.value] ?? 0} tone={countTones[s.value] ?? 'navy'} />)}
            </div>
            <Card>
                <DataTable
                    rows={rows}
                    filters={filters}
                    searchPlaceholder={t('Lawyer, firm or client')}
                    toolbar={<>
                        <Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? ''} onChange={(e) => visit({ status: e.target.value || undefined })} options={statuses} placeholder={t('All statuses')} />
                        <Select aria-label={t('When')} wrapperClassName="w-36" value={filters.when ?? ''} onChange={(e) => visit({ when: e.target.value || undefined })} options={[{ value: 'upcoming', label: t('Upcoming') }, { value: 'past', label: t('Past') }]} placeholder={t('Any time')} />
                    </>}
                    empty={t('No appointments yet.')}
                    columns={[
                        { key: 'starts_at', label: t('When'), render: (r) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{formatDateTime(r.starts_at, locale)}{r.rescheduled && <History className="size-3.5 text-amber-600" aria-label={t('Rescheduled')} />}</span> },
                        { key: 'lawyer', label: t('Lawyer'), render: (r) => <UserCell name={r.lawyer} avatar={r.lawyer_avatar} subtitle={r.organization} /> },
                        { key: 'client', label: t('Client'), render: (r) => r.client },
                        { key: 'mode', label: t('Type'), hideOnMobile: true, render: (r) => r.mode },
                        { key: 'status', label: t('Status'), render: (r) => <StatusBadge value={r.status} label={r.status_label} /> },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
