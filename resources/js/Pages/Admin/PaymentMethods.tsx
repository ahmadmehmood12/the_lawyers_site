import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type Detail = { label: string; value: string };
type Method = {
    id: number;
    key: string;
    name: string;
    kind: 'stripe' | 'manual';
    is_enabled: boolean;
    instructions: string | null;
    details: Detail[];
    sort_order: number;
};

export default function PaymentMethods({ methods, kinds, stripeConfigured }: { methods: Method[]; kinds: { value: string; label: string }[]; stripeConfigured: boolean }) {
    const t = useT();
    const [editing, setEditing] = useState<Method | null | undefined>(undefined);

    function toggle(method: Method) {
        router.put(
            route('admin.payment-methods.update', method.id),
            { ...method, is_enabled: !method.is_enabled, details: method.details ?? [] },
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout title={t('Payment methods')} area="admin" wide>
            <PageHeader
                title={t('Plan payment methods')}
                description={t('Enable or disable how organizations pay for plans. SadaPay and NayaPay are ready but switched off until you enable them.')}
                actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New method')}</Button>}
            />

            {!stripeConfigured && (
                <Alert tone="warning" className="mb-4">
                    {t('Stripe keys are not configured. Add STRIPE_KEY, STRIPE_SECRET and STRIPE_WEBHOOK_SECRET to the environment before enabling card payments.')}
                </Alert>
            )}

            <Card>
                <CardHeader title={t('Methods')} description={t('Manual methods show the details you enter here and require a screenshot.')} />
                <CardBody className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-navy-100 text-start text-xs text-navy-500 dark:border-navy-800">
                            <tr>
                                <th className="px-3 py-2 text-start font-semibold">{t('Name')}</th>
                                <th className="px-3 py-2 text-start font-semibold">{t('Key')}</th>
                                <th className="px-3 py-2 text-start font-semibold">{t('Type')}</th>
                                <th className="px-3 py-2 text-start font-semibold">{t('Details')}</th>
                                <th className="px-3 py-2 text-start font-semibold">{t('Status')}</th>
                                <th className="px-3 py-2 text-end font-semibold">{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                            {methods.map((method) => (
                                <tr key={method.id}>
                                    <td className="px-3 py-3 font-medium">{method.name}</td>
                                    <td className="px-3 py-3 font-mono text-xs text-navy-500">{method.key}</td>
                                    <td className="px-3 py-3"><Badge tone={method.kind === 'stripe' ? 'blue' : 'neutral'}>{method.kind === 'stripe' ? t('Card (Stripe)') : t('Manual transfer')}</Badge></td>
                                    <td className="px-3 py-3 text-xs text-navy-500">
                                        {method.details.length === 0 ? '—' : method.details.map((row) => `${row.label}: ${row.value || '—'}`).join(' · ')}
                                    </td>
                                    <td className="px-3 py-3">
                                        <button type="button" onClick={() => toggle(method)} className="inline-flex items-center gap-2 text-sm">
                                            <span className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${method.is_enabled ? 'bg-verdant-600' : 'bg-navy-300 dark:bg-navy-600'}`}>
                                                <span className={`size-4 rounded-full bg-white transition-transform ${method.is_enabled ? 'translate-x-4' : ''}`} />
                                            </span>
                                            <span className="text-xs text-navy-600 dark:text-navy-300">{method.is_enabled ? t('Enabled') : t('Disabled')}</span>
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 text-end">
                                        <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(method)}>{t('Edit')}</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardBody>
            </Card>

            {editing !== undefined && <MethodDialog key={editing?.id ?? 'new'} method={editing} kinds={kinds} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function MethodDialog({ method, kinds, onClose }: { method: Method | null; kinds: { value: string; label: string }[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({
        key: method?.key ?? '',
        name: method?.name ?? '',
        kind: method?.kind ?? 'manual',
        is_enabled: method?.is_enabled ?? false,
        instructions: method?.instructions ?? '',
        details: method?.details?.length ? method.details : [{ label: '', value: '' }],
        sort_order: String(method?.sort_order ?? 0),
    });

    function setDetail(index: number, patch: Partial<Detail>) {
        form.setData('details', form.data.details.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function save() {
        form.transform((data) => ({
            ...data,
            sort_order: Number(data.sort_order),
            details: data.details.filter((row) => row.label.trim() !== ''),
        }));
        method ? form.put(route('admin.payment-methods.update', method.id), { onSuccess: onClose }) : form.post(route('admin.payment-methods.store'), { onSuccess: onClose });
    }

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={method ? t('Edit payment method') : t('New payment method')}
            footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={save}>{t('Save')}</Button></>}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Name')} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />
                <Input label={t('Key')} value={form.data.key} onChange={(event) => form.setData('key', event.target.value)} error={form.errors.key} hint={t('Lowercase identifier, e.g. jazzcash.')} />
                <Select label={t('Type')} value={form.data.kind} onChange={(event) => form.setData('kind', event.target.value as 'stripe' | 'manual')} options={kinds} error={form.errors.kind} />
                <Input label={t('Sort order')} type="number" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value)} error={form.errors.sort_order} />
                <div className="flex items-end"><Checkbox label={t('Enabled')} checked={form.data.is_enabled} onChange={(event) => form.setData('is_enabled', event.target.checked)} /></div>
                <Textarea wrapperClassName="sm:col-span-2" label={t('Instructions')} rows={2} value={form.data.instructions} onChange={(event) => form.setData('instructions', event.target.value)} error={form.errors.instructions} hint={t('Shown above the payment form.')} />

                <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-navy-800 dark:text-navy-200">{t('Account details')}</p>
                        <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => form.setData('details', [...form.data.details, { label: '', value: '' }])}>{t('Add row')}</Button>
                    </div>
                    <div className="space-y-2">
                        {form.data.details.map((row, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <Input className="w-40" placeholder={t('Label')} value={row.label} onChange={(event) => setDetail(index, { label: event.target.value })} />
                                <Input className="flex-1" placeholder={t('Value')} value={row.value} onChange={(event) => setDetail(index, { value: event.target.value })} />
                                <Button size="sm" variant="ghost" className="mt-0.5" icon={<Trash2 className="size-4" />} onClick={() => form.setData('details', form.data.details.filter((_, i) => i !== index))} aria-label={t('Remove')} />
                            </div>
                        ))}
                    </div>
                    {form.errors.details && <p className="mt-1 text-xs font-medium text-red-600">{form.errors.details}</p>}
                </div>
            </div>
        </Modal>
    );
}
