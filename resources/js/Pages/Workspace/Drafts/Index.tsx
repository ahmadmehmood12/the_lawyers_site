import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Card, DataTable, LinkButton, PageHeader, Select, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Row = { id: number; title: string; status: string; status_label: string; version: number; case: { reference: string; title: string } | null; author: string; updated_at: string };

export default function DraftsIndex({ drafts, filters, statuses }: { drafts: Paginated<Row>; filters: Record<string, string>; statuses: Option[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Legal Drafting')} wide>
            <PageHeader title={t('Legal Drafting')} description={t('Draft, review and export pleadings, notices and agreements.')} actions={<LinkButton href={route('drafts.create')} icon={<Plus className="size-4" />}>{t('New draft')}</LinkButton>} />
            <Card>
                <DataTable
                    rows={drafts}
                    filters={filters}
                    rowHref={(r) => route('drafts.edit', r.id)}
                    toolbar={<Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? ''} onChange={(e) => router.get(route('drafts.index'), { ...filters, status: e.target.value || undefined }, { preserveState: true })} options={statuses} placeholder={t('All statuses')} />}
                    columns={[
                        { key: 'title', label: t('Draft'), render: (r) => (<div><p className="font-medium">{r.title}</p><p className="text-xs text-navy-500">v{r.version}, {r.author}</p></div>) },
                        { key: 'case', label: t('Case'), hideOnMobile: true, render: (r) => <span className="text-xs">{r.case ? `${r.case.reference}, ${r.case.title}` : '—'}</span> },
                        { key: 'updated_at', label: t('Updated'), hideOnMobile: true, render: (r) => formatDateTime(r.updated_at, locale) },
                        { key: 'status', label: t('Status'), render: (r) => <StatusBadge value={r.status} label={r.status_label} /> },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
