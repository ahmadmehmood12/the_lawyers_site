import { useForm } from '@inertiajs/react';
import { Ban, Download, FileCheck2, Pencil, Printer, Receipt, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, ConfirmAction, Input, LinkButton, Modal, PageHeader, Select, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatMoney, todayIso } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';

type Payment = { id: number; receipt_number: string; amount: string; method: string; reference: string | null; paid_on: string; received_by: string | null; refunded: number; refunds: { amount: string; reason: string; refunded_on: string }[] };
type Invoice = Record<string, any> & { id: number; number: string; status: string; status_label: string; items: any[]; payments: Payment[]; client: { id: number; name: string; phone: string | null; email: string | null; address: string | null }; case: { id: number; title: string; reference: string } | null };

export default function InvoiceShow({ invoice: inv, methods, can }: { invoice: Invoice; methods: Option[]; can: Record<string, boolean> }) {
    const t = useT();
    const { locale } = useLocale();
    const [payOpen, setPayOpen] = useState(false);
    const [refund, setRefund] = useState<Payment | null>(null);

    return (
        <AppLayout title={inv.number}>
            <PageHeader
                title={<span className="ltr-nums">{inv.number}</span>}
                breadcrumbs={[{ label: t('Invoices & Payments'), href: route('invoices.index') }, { label: inv.number }]}
                description={<StatusBadge value={inv.status} label={inv.status_label} />}
                actions={
                    <>
                        {can.edit && <LinkButton href={route('invoices.edit', inv.id)} variant="secondary" icon={<Pencil className="size-4" />}>{t('Edit')}</LinkButton>}
                        {can.issue && <ConfirmAction href={route('invoices.issue', inv.id)} tone="primary" title={t('Issue this invoice?')} description={t('An invoice number is assigned and the invoice can no longer be edited.')} confirmLabel={t('Issue')} trigger={(open) => <Button icon={<FileCheck2 className="size-4" />} onClick={open}>{t('Issue')}</Button>} />}
                        {can.pay && <Button variant="success" icon={<Receipt className="size-4" />} onClick={() => setPayOpen(true)}>{t('Record payment')}</Button>}
                        <a href={route('invoices.pdf', inv.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-navy-200 ring-inset dark:bg-navy-900 dark:ring-navy-700"><Download className="size-4" />PDF</a>
                        {can.void && <ConfirmAction href={route('invoices.void', inv.id)} title={t('Void invoice?')} reasonField="reason" confirmLabel={t('Void')} trigger={(open) => <Button variant="ghost" icon={<Ban className="size-4" />} onClick={open}>{t('Void')}</Button>} />}
                    </>
                }
            />
            {inv.status === 'void' && <Alert tone="danger" className="mb-5" title={t('Voided')}>{inv.void_reason}</Alert>}
            {inv.status === 'draft' && <Alert tone="info" className="mb-5">{t('Draft — not visible to the client until issued.')}</Alert>}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardBody className="space-y-5">
                        <div className="flex flex-wrap justify-between gap-4 text-sm">
                            <div><p className="text-[13px] font-semibold text-navy-500">{t('Bill to')}</p><p className="font-medium">{inv.client.name}</p><p className="text-navy-500">{inv.client.address}</p><p className="ltr-nums text-navy-500">{inv.client.phone}</p></div>
                            <div className="text-end"><p>{t('Issued')}: {formatDate(inv.issue_date, locale)}</p>{inv.due_date && <p className={inv.overdue ? 'font-semibold text-red-600' : ''}>{t('Due')}: {formatDate(inv.due_date, locale)}</p>}{inv.case && <p className="text-navy-500">{inv.case.reference}</p>}</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="border-b border-navy-200 text-[13px] text-navy-500 dark:border-navy-700"><tr><th className="py-2 text-start">{t('Description')}</th><th className="py-2 text-end">{t('Qty')}</th><th className="py-2 text-end">{t('Rate')}</th><th className="py-2 text-end">{t('Amount')}</th></tr></thead>
                                <tbody className="divide-y divide-navy-100 dark:divide-navy-800">{inv.items.map((i: any) => <tr key={i.id}><td className="py-2">{i.description}</td><td className="py-2 text-end tabular-nums">{Number(i.quantity)}</td><td className="py-2 text-end tabular-nums">{formatMoney(i.unit_price, locale)}</td><td className="py-2 text-end tabular-nums">{formatMoney(i.amount, locale)}</td></tr>)}</tbody>
                            </table>
                        </div>
                        <dl className="ms-auto grid max-w-xs gap-1.5 text-sm">
                            <div className="flex justify-between"><dt>{t('Subtotal')}</dt><dd className="tabular-nums">{formatMoney(inv.subtotal, locale)}</dd></div>
                            {Number(inv.discount) > 0 && <div className="flex justify-between"><dt>{t('Discount')}</dt><dd className="tabular-nums">−{formatMoney(inv.discount, locale)}</dd></div>}
                            {Number(inv.tax_amount) > 0 && <div className="flex justify-between"><dt>{t('Tax')} ({inv.tax_rate}%)</dt><dd className="tabular-nums">{formatMoney(inv.tax_amount, locale)}</dd></div>}
                            <div className="flex justify-between border-t border-navy-200 pt-1.5 font-semibold dark:border-navy-700"><dt>{t('Total')}</dt><dd className="tabular-nums">{formatMoney(inv.total, locale)}</dd></div>
                            <div className="flex justify-between text-verdant-700 dark:text-verdant-300"><dt>{t('Paid')}</dt><dd className="tabular-nums">{formatMoney(inv.amount_paid, locale)}</dd></div>
                            <div className="flex justify-between text-base font-semibold"><dt>{t('Balance')}</dt><dd className="tabular-nums">{formatMoney(inv.balance, locale)}</dd></div>
                        </dl>
                        {inv.notes && <p className="text-sm text-navy-600 dark:text-navy-300">{inv.notes}</p>}
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Payments')} description={t('Payments cannot be edited or deleted. Use refunds to correct.')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {inv.payments.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">{t('No payments yet.')}</li>}
                        {inv.payments.map((p) => (
                            <li key={p.id} className="space-y-1 px-5 py-3 text-sm">
                                <div className="flex items-center justify-between"><span className="font-semibold tabular-nums">{formatMoney(p.amount, locale)}</span><span className="ltr-nums text-xs text-navy-500">{p.receipt_number}</span></div>
                                <p className="text-xs text-navy-500">{formatDate(p.paid_on, locale)}, {p.method}{p.reference ? `, ${p.reference}` : ''}{p.received_by ? `, ${p.received_by}` : ''}</p>
                                {p.refunds.map((r, i) => <p key={i} className="text-xs text-red-600">{t('Refunded')} {formatMoney(r.amount, locale)}, {r.reason}</p>)}
                                <div className="flex gap-2 pt-1">
                                    <a href={route('payments.receipt', p.id)} className="inline-flex items-center gap-1 text-xs font-medium underline"><Printer className="size-3.5" />{t('Receipt PDF')}</a>
                                    {can.refund && Number(p.amount) > p.refunded && <button type="button" onClick={() => setRefund(p)} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 underline"><Undo2 className="size-3.5" />{t('Refund')}</button>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
            <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} invoiceId={inv.id} balance={inv.balance} methods={methods} />
            <RefundDialog payment={refund} onClose={() => setRefund(null)} />
        </AppLayout>
    );
}

function PaymentDialog({ open, onClose, invoiceId, balance, methods }: { open: boolean; onClose: () => void; invoiceId: number; balance: string; methods: Option[] }) {
    const t = useT();
    const form = useForm({ amount: balance, method: 'cash', reference: '', paid_on: todayIso(), notes: '', idempotency_key: crypto.randomUUID() });
    return (
        <Modal open={open} onClose={onClose} title={t('Record payment')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button variant="success" loading={form.processing} onClick={() => form.post(route('invoices.payments.store', invoiceId), { preserveScroll: true, onSuccess: () => { form.setData({ ...form.data, idempotency_key: crypto.randomUUID() }); onClose(); } })}>{t('Save & issue receipt')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Amount (PKR)')} type="number" min={1} max={balance} value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} error={form.errors.amount} />
                <Select label={t('Method')} value={form.data.method} onChange={(e) => form.setData('method', e.target.value)} options={methods} />
                <Input label={t('Date received')} type="date" max={todayIso()} value={form.data.paid_on} onChange={(e) => form.setData('paid_on', e.target.value)} error={form.errors.paid_on} />
                <Input label={t('Reference / cheque no.')} value={form.data.reference} onChange={(e) => form.setData('reference', e.target.value)} error={form.errors.reference} />
                <Input wrapperClassName="sm:col-span-2" label={t('Notes')} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
            </div>
        </Modal>
    );
}

function RefundDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ amount: '', reason: '', refunded_on: todayIso() });
    return (
        <Modal open={!!payment} onClose={onClose} title={t('Record refund')} description={payment?.receipt_number} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button variant="danger" loading={form.processing} onClick={() => payment && form.post(route('payments.refunds.store', payment.id), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } })}>{t('Record refund')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Amount (PKR)')} type="number" min={1} value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} error={form.errors.amount} />
                <Input label={t('Date')} type="date" max={todayIso()} value={form.data.refunded_on} onChange={(e) => form.setData('refunded_on', e.target.value)} />
                <Input wrapperClassName="sm:col-span-2" label={t('Reason')} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} error={form.errors.reason} />
            </div>
        </Modal>
    );
}
