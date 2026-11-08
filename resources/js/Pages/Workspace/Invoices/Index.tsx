import { router } from '@inertiajs/react';
import { Download, Plus } from 'lucide-react';
import { Card, DataTable, LinkButton, PageHeader, Select, Stat, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Row = { id: number; number: string; status: string; status_label: string; issue_date: string; due_date: string | null; total: string; amount_paid: string; balance: string; overdue: boolean; client: string | null; case_reference: string | null };

export default function InvoicesIndex({ invoices, filters, summary, options, can }: { invoices: Paginated<Row>; filters: Record<string, string>; summary: { outstanding: number; overdue: number; collected_month: number }; options: { statuses: Option[]; clients: SelectOption[] }; can: { create: boolean; export: boolean } }) {
    const t = useT();
    const { locale } = useLocale();
    const visit = (p: Record<string, string | undefined>) => router.get(route('invoices.index'), { ...filters, ...p }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Invoices & Payments')} wide>
            <PageHeader title={t('Invoices & Payments')} actions={<>{can.export && <LinkButton href={route('invoices.export', filters)} variant="secondary" icon={<Download className="size-4" />} as="a">{t('Export CSV')}</LinkButton>}{can.create && <LinkButton href={route('invoices.create')} icon={<Plus className="size-4" />}>{t('New invoice')}</LinkButton>}</>} />
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Stat label={t('Outstanding')} value={formatMoney(summary.outstanding, locale)} tone="gold" />
                <Stat label={t('Overdue')} value={formatMoney(summary.overdue, locale)} tone="red" />
                <Stat label={t('Collected this month')} value={formatMoney(summary.collected_month, locale)} tone="green" />
            </div>
            <Card>
                <DataTable
                    rows={invoices}
                    filters={filters}
                    rowHref={(r) => route('invoices.show', r.id)}
                    searchPlaceholder={t('Invoice no. or client…')}
                    toolbar={<Select aria-label={t('Status')} wrapperClassName="w-44" value={filters.status ?? ''} onChange={(e) => visit({ status: e.target.value || undefined })} placeholder={t('All statuses')} options={[...options.statuses, { value: 'overdue', label: t('Overdue') }]} />}
                    columns={[
                        { key: 'number', label: t('Invoice'), sortable: true, render: (r) => (<div><p className="ltr-nums font-medium">{r.number}</p><p className="text-xs text-navy-500">{r.client}{r.case_reference ? `, ${r.case_reference}` : ''}</p></div>) },
                        { key: 'issue_date', label: t('Issued'), sortable: true, hideOnMobile: true, render: (r) => formatDate(r.issue_date, locale) },
                        { key: 'due_date', label: t('Due'), sortable: true, hideOnMobile: true, render: (r) => <span className={r.overdue ? 'font-semibold text-red-600' : ''}>{r.due_date ? formatDate(r.due_date, locale) : '—'}</span> },
                        { key: 'total', label: t('Total'), sortable: true, className: 'text-end', render: (r) => <span className="tabular-nums">{formatMoney(r.total, locale)}</span> },
                        { key: 'balance', label: t('Balance'), className: 'text-end', render: (r) => <span className="tabular-nums">{formatMoney(r.balance, locale)}</span> },
                        { key: 'status', label: t('Status'), render: (r) => <StatusBadge value={r.overdue ? 'past_due' : r.status} label={r.overdue ? t('Overdue') : r.status_label} /> },
                    ]}
                />
            </Card>
        </AppLayout>
    );
}
