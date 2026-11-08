import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardBody, CardHeader, Input, LinkButton, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatMoney, todayIso } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Item = { type: string; description: string; quantity: string; unit_price: string; expense_id: number | null };
type Options = { clients: SelectOption[]; cases: (SelectOption & { client_ids: number[]; fee: string | null })[]; expenses: { id: number; legal_case_id: number; description: string; amount: string }[] };

export default function InvoiceForm({ invoice, preset, options }: { invoice: Record<string, any> | null; preset: { client_id: number | null; legal_case_id: number | null } | null; options: Options }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({
        client_id: String(invoice?.client_id ?? preset?.client_id ?? ''), legal_case_id: String(invoice?.legal_case_id ?? preset?.legal_case_id ?? ''),
        issue_date: invoice?.issue_date ?? todayIso(), due_date: invoice?.due_date ?? '', discount: String(invoice?.discount ?? '0'), tax_rate: String(invoice?.tax_rate ?? '0'), notes: invoice?.notes ?? '',
        items: ((invoice?.items ?? [{ type: 'fee', description: t('Professional fee'), quantity: '1', unit_price: '', expense_id: null }]) as Item[]).map((i) => ({ ...i, quantity: String(i.quantity), unit_price: String(i.unit_price) })),
    });
    const cases = options.cases.filter((c) => !form.data.client_id || c.client_ids.includes(Number(form.data.client_id)));
    const expenses = options.expenses.filter((e) => String(e.legal_case_id) === form.data.legal_case_id && !form.data.items.some((i) => i.expense_id === e.id));
    const subtotal = form.data.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const taxable = Math.max(0, subtotal - Number(form.data.discount || 0));
    const total = taxable + (taxable * Number(form.data.tax_rate || 0)) / 100;
    const setItem = (index: number, patch: Partial<Item>) => form.setData('items', form.data.items.map((i, n) => (n === index ? { ...i, ...patch } : i)));
    const err = (k: string) => (form.errors as Record<string, string>)[k];

    function submit(e: FormEvent) {
        e.preventDefault();
        form.transform((d) => ({ ...d, legal_case_id: d.legal_case_id || null, due_date: d.due_date || null }));
        invoice?.id ? form.put(route('invoices.update', invoice.id)) : form.post(route('invoices.store'));
    }

    return (
        <AppLayout title={invoice ? t('Edit draft invoice') : t('New invoice')}>
            <PageHeader title={invoice ? t('Edit draft invoice') : t('New invoice')} breadcrumbs={[{ label: t('Invoices & Payments'), href: route('invoices.index') }, { label: t('Draft') }]} />
            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardBody className="grid gap-4 md:grid-cols-4">
                        <Select wrapperClassName="md:col-span-2" label={t('Client')} value={form.data.client_id} onChange={(e) => form.setData((d) => ({ ...d, client_id: e.target.value, legal_case_id: '' }))} options={options.clients} placeholder={t('Select client')} error={err('client_id')} required />
                        <Select wrapperClassName="md:col-span-2" label={t('Case')} value={form.data.legal_case_id} onChange={(e) => form.setData('legal_case_id', e.target.value)} options={cases} placeholder={t('Not linked')} error={err('legal_case_id')} />
                        <Input label={t('Issue date')} type="date" value={form.data.issue_date} onChange={(e) => form.setData('issue_date', e.target.value)} error={err('issue_date')} />
                        <Input label={t('Due date')} type="date" value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} error={err('due_date')} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Items')} actions={<div className="flex flex-wrap gap-2">
                        {expenses.length > 0 && <Select aria-label={t('Add expense')} wrapperClassName="w-56" value="" onChange={(e) => { const x = options.expenses.find((ex) => String(ex.id) === e.target.value); if (x) form.setData('items', [...form.data.items, { type: 'expense', description: x.description, quantity: '1', unit_price: x.amount, expense_id: x.id }]); }} placeholder={t('+ Add unbilled expense')} options={expenses.map((x) => ({ value: x.id, label: `${x.description}, ${formatMoney(x.amount, locale)}` }))} />}
                        <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => form.setData('items', [...form.data.items, { type: 'fee', description: '', quantity: '1', unit_price: '', expense_id: null }])}>{t('Add item')}</Button>
                    </div>} />
                    <CardBody className="space-y-3">
                        {form.data.items.map((item, i) => (
                            <div key={i} className="grid gap-2 md:grid-cols-[130px_1fr_90px_140px_120px_auto] md:items-end">
                                <Select label={i === 0 ? t('Type') : undefined} aria-label={t('Type')} value={item.type} onChange={(e) => setItem(i, { type: e.target.value })} options={[{ value: 'fee', label: t('Fee') }, { value: 'consultation', label: t('Consultation') }, { value: 'expense', label: t('Expense') }, { value: 'other', label: t('Other') }]} />
                                <Input label={i === 0 ? t('Description') : undefined} aria-label={t('Description')} value={item.description} onChange={(e) => setItem(i, { description: e.target.value })} error={err(`items.${i}.description`)} />
                                <Input label={i === 0 ? t('Qty') : undefined} aria-label={t('Qty')} type="number" step="0.01" min={0.01} value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                                <Input label={i === 0 ? t('Rate (PKR)') : undefined} aria-label={t('Rate')} type="number" min={0} value={item.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} error={err(`items.${i}.unit_price`)} />
                                <p className="py-2 text-end text-sm tabular-nums">{formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0), locale)}</p>
                                <Button variant="ghost" size="sm" aria-label={t('Remove')} onClick={() => form.setData('items', form.data.items.filter((_, n) => n !== i))} disabled={form.data.items.length === 1}><Trash2 className="size-4" /></Button>
                            </div>
                        ))}
                        {err('items') && <p className="text-xs text-red-600">{err('items')}</p>}
                        <div className="ms-auto grid max-w-xs gap-2 border-t border-navy-100 pt-3 text-sm dark:border-navy-800">
                            <div className="flex justify-between"><span>{t('Subtotal')}</span><span className="tabular-nums">{formatMoney(subtotal, locale)}</span></div>
                            <div className="flex items-center justify-between gap-2"><span>{t('Discount')}</span><input type="number" min={0} value={form.data.discount} onChange={(e) => form.setData('discount', e.target.value)} className="w-28 rounded-md border-0 py-1 text-end text-sm ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('Discount')} /></div>
                            <div className="flex items-center justify-between gap-2"><span>{t('Tax %')}</span><input type="number" min={0} max={100} step="0.01" value={form.data.tax_rate} onChange={(e) => form.setData('tax_rate', e.target.value)} className="w-28 rounded-md border-0 py-1 text-end text-sm ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('Tax %')} /></div>
                            <div className="flex justify-between text-base font-semibold"><span>{t('Total')}</span><span className="tabular-nums">{formatMoney(total, locale)}</span></div>
                        </div>
                    </CardBody>
                </Card>
                <Card><CardBody><Textarea label={t('Notes on invoice')} rows={2} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} /></CardBody></Card>
                <div className="flex justify-end gap-2">
                    <LinkButton href={invoice?.id ? route('invoices.show', invoice.id) : route('invoices.index')} variant="secondary">{t('Cancel')}</LinkButton>
                    <Button type="submit" loading={form.processing}>{t('Save draft')}</Button>
                </div>
            </form>
        </AppLayout>
    );
}
