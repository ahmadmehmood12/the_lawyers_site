import { router, useForm } from '@inertiajs/react';
import { Check, ExternalLink, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Row = {
    id: number;
    organization: string | null;
    user: string | null;
    email: string;
    plan: string | null;
    method: string | null;
    billing_cycle: string;
    amount: string;
    currency: string;
    status: string;
    status_label: string;
    reference: string | null;
    notes: string | null;
    admin_notes: string | null;
    has_screenshot: boolean;
    screenshot_url: string | null;
    provider_reference: string | null;
    created_at: string | null;
    paid_at: string | null;
};

type Paginated = { data: Row[]; links: { url: string | null; label: string; active: boolean }[] };

export default function PlanPayments({ rows, filters, statuses }: { rows: Paginated; filters: { status: string; search: string }; statuses: { value: string; label: string }[] }) {
    const t = useT();
    const { locale } = useLocale();
    const [search, setSearch] = useState(filters.search);
    const [rejecting, setRejecting] = useState<Row | null>(null);

    function applyFilters(patch: Record<string, string>) {
        router.get(route('admin.payments.index'), { ...filters, search, ...patch }, { preserveState: true, replace: true });
    }

    function approve(row: Row) {
        if (!window.confirm(t('Approve this payment and activate the plan?'))) return;
        router.post(route('admin.payments.approve', row.id), {}, { preserveScroll: true });
    }

    return (
        <AppLayout title={t('Plan payments')} area="admin" wide>
            <PageHeader title={t('Plan payments')} description={t('Verify manual transfers and review card payments. Approving activates the plan immediately.')} />

            <Card>
                <CardHeader
                    title={t('Payments')}
                    actions={
                        <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); applyFilters({ search }); }}>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search email, reference or firm')} className="w-64" />
                            <Button type="submit" variant="secondary" icon={<Search className="size-4" />}>{t('Search')}</Button>
                            <Select value={filters.status} onChange={(event) => applyFilters({ status: event.target.value })} options={[{ value: '', label: t('All statuses') }, ...statuses]} />
                        </form>
                    }
                />
                <CardBody className="overflow-x-auto">
                    {rows.data.length === 0 ? (
                        <p className="py-4 text-sm text-navy-500">{t('No plan payments found.')}</p>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-navy-100 text-start text-xs text-navy-500 dark:border-navy-800">
                                <tr>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Organization')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Plan')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Amount')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Method')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Status')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Proof')}</th>
                                    <th className="px-3 py-2 text-start font-semibold">{t('Submitted')}</th>
                                    <th className="px-3 py-2 text-end font-semibold">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                                {rows.data.map((row) => (
                                    <tr key={row.id} className="align-top">
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{row.organization ?? '—'}</p>
                                            <p className="text-xs text-navy-500">{row.email}</p>
                                        </td>
                                        <td className="px-3 py-3">{row.plan} <span className="text-xs text-navy-500">({row.billing_cycle})</span></td>
                                        <td className="px-3 py-3 whitespace-nowrap">{formatMoney(Number(row.amount), locale)}</td>
                                        <td className="px-3 py-3">{row.method ?? '—'}</td>
                                        <td className="px-3 py-3"><StatusBadge value={row.status} label={row.status_label} /></td>
                                        <td className="px-3 py-3">
                                            {row.screenshot_url ? (
                                                <a href={row.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 underline dark:text-gold-400">
                                                    {t('Screenshot')} <ExternalLink className="size-3" />
                                                </a>
                                            ) : row.provider_reference ? <span className="font-mono text-xs text-navy-500">{row.provider_reference}</span> : '—'}
                                            {row.reference && <p className="mt-1 text-xs text-navy-500">{row.reference}</p>}
                                            {row.notes && <p className="mt-1 max-w-52 text-xs text-navy-500">{row.notes}</p>}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-navy-500">{row.created_at ? formatDateTime(row.created_at, locale) : '—'}</td>
                                        <td className="px-3 py-3">
                                            {row.status === 'awaiting_verification' || row.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={() => approve(row)}>{t('Approve')}</Button>
                                                    <Button size="sm" variant="danger" icon={<X className="size-4" />} onClick={() => setRejecting(row)}>{t('Reject')}</Button>
                                                </div>
                                            ) : (
                                                <div className="text-end text-xs text-navy-500">
                                                    {row.paid_at ? formatDateTime(row.paid_at, locale) : '—'}
                                                    {row.admin_notes && <p className="mt-1 max-w-52 text-red-600">{row.admin_notes}</p>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {rows.links.length > 3 && (
                        <div className="mt-4 flex flex-wrap gap-1">
                            {rows.links.map((link, index) => (
                                <Button
                                    key={index}
                                    size="sm"
                                    variant={link.active ? 'primary' : 'secondary'}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {rejecting && <RejectDialog row={rejecting} onClose={() => setRejecting(null)} />}
        </AppLayout>
    );
}

function RejectDialog({ row, onClose }: { row: Row; onClose: () => void }) {
    const t = useT();
    const form = useForm({ reason: '' });

    return (
        <Modal
            open
            onClose={onClose}
            title={t('Reject payment')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
                    <Button
                        variant="danger"
                        loading={form.processing}
                        onClick={() => form.post(route('admin.payments.reject', row.id), { preserveScroll: true, onSuccess: onClose })}
                    >
                        {t('Reject payment')}
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                <p className="text-sm text-navy-600 dark:text-navy-300">{t('The reason is shown to the organization on their billing page.')}</p>
                <Textarea label={t('Reason')} required rows={3} value={form.data.reason} onChange={(event) => form.setData('reason', event.target.value)} error={form.errors.reason} />
            </div>
        </Modal>
    );
}
