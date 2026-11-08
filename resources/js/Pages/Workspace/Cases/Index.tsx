import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Card, DataTable, LinkButton, PageHeader, Select, StatusBadge } from '@/Components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Row = { id: number; reference: string; title: string; case_number: string | null; case_type_label: string; status: string; status_label: string; priority: string; priority_label: string; court: string | null; clients: string[]; lawyers: string[]; next_hearing_at: string | null };

export default function CasesIndex({ cases, filters, options }: { cases: Paginated<Row>; filters: Record<string, string>; options: { statuses: Option[]; types: Option[]; courts: SelectOption[]; lawyers: SelectOption[] } }) {
    const t = useT();
    const { locale } = useLocale();
    const { can } = usePermissions();
    const filter = (key: string, value: string) => router.get(route('cases.index'), { ...filters, [key]: value || undefined, page: undefined }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Cases')} wide>
            <PageHeader title={t('Cases')} description={t('All case files you can access.')} actions={can('cases.create') && <LinkButton href={route('cases.create')} icon={<Plus className="size-4" />}>{t('New case')}</LinkButton>} />
            <Card>
                <DataTable
                    rows={cases}
                    filters={filters}
                    searchPlaceholder={t('Title, case no., FIR, client…')}
                    rowHref={(r) => route('cases.show', r.id)}
                    toolbar={
                        <>
                            <Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? ''} onChange={(e) => filter('status', e.target.value)} placeholder={t('All statuses')} options={[{ value: 'open', label: t('Open cases') }, ...options.statuses]} />
                            <Select aria-label={t('Type')} wrapperClassName="w-36" value={filters.case_type ?? ''} onChange={(e) => filter('case_type', e.target.value)} placeholder={t('All types')} options={options.types} />
                            <Select aria-label={t('Court')} wrapperClassName="w-48" value={filters.court_id ?? ''} onChange={(e) => filter('court_id', e.target.value)} placeholder={t('All courts')} options={options.courts} />
                            {options.lawyers.length > 1 && <Select aria-label={t('Lawyer')} wrapperClassName="w-40" value={filters.lawyer_id ?? ''} onChange={(e) => filter('lawyer_id', e.target.value)} placeholder={t('All lawyers')} options={options.lawyers} />}
                        </>
                    }
                    columns={[
                        { key: 'title', label: t('Case'), sortable: true, render: (r) => (<div className="min-w-48"><p className="font-medium">{r.title}</p><p className="ltr-nums text-xs text-navy-500">{r.reference}{r.case_number ? `, ${r.case_number}` : ''}</p></div>) },
                        { key: 'clients', label: t('Client'), hideOnMobile: true, render: (r) => r.clients.join(', ') || '—' },
                        { key: 'court', label: t('Court'), hideOnMobile: true, render: (r) => <span className="text-xs">{r.court ?? '—'}</span> },
                        { key: 'next_hearing_at', label: t('Next hearing'), sortable: true, render: (r) => (r.next_hearing_at ? formatDate(r.next_hearing_at, locale) : '—') },
                        { key: 'status', label: t('Status'), sortable: true, render: (r) => (<div className="flex flex-col items-start gap-1"><StatusBadge value={r.status} label={r.status_label} />{['high', 'urgent'].includes(r.priority) && <StatusBadge value={r.priority} label={r.priority_label} />}</div>) },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
