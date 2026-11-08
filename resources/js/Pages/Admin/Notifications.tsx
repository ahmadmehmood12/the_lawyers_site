import { router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardHeader, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Template = { id: number; key: string; name: string; language: string; body_preview: string; variable_count: number; status: string };

export default function Notifications({ templates, deliveries, configured, filters }: { templates: Template[]; deliveries: Paginated<any>; configured: boolean; filters: Record<string, string> }) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<Template | null | undefined>(undefined);
    return (
        <AppLayout title={t('Notifications')} area="admin" wide>
            <PageHeader title={t('WhatsApp & notification delivery')} />
            {!configured && <Alert tone="warning" className="mb-5" title={t('WhatsApp Business API not configured')}>{t('Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server. Until then, WhatsApp deliveries are recorded as “skipped” — never as sent.')}</Alert>}
            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader title={t('Message templates')} description={t('Each must be approved in Meta Business Manager before marking it approved here.')} actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('Add')}</Button>} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">{templates.map((tp) => <li key={tp.id}><button type="button" onClick={() => setEditing(tp)} className="w-full space-y-1 px-5 py-3 text-start text-sm hover:bg-navy-50 dark:hover:bg-navy-800"><p className="flex items-center justify-between gap-2"><span className="font-medium">{tp.key} <Badge>{tp.language}</Badge></span><StatusBadge value={tp.status === 'approved' ? 'approved' : tp.status} label={tp.status} /></p><p className="ltr-nums text-xs text-navy-500">{tp.name}</p><p className="text-xs" dir={tp.language === 'ur' ? 'rtl' : undefined}>{tp.body_preview}</p></button></li>)}</ul>
                </Card>
                <Card>
                    <CardHeader title={t('Delivery log')} actions={<Select aria-label={t('Status')} wrapperClassName="w-36" value={filters.status ?? ''} onChange={(e) => router.get(route('admin.notifications.index'), { status: e.target.value || undefined }, { preserveState: true })} options={['queued', 'sent', 'delivered', 'read', 'failed', 'skipped'].map((s) => ({ value: s, label: s }))} placeholder={t('All')} />} />
                    <div className="overflow-x-auto"><table className="min-w-full text-xs"><tbody className="divide-y divide-navy-100 dark:divide-navy-800">{deliveries.data.map((d) => <tr key={d.id} className="align-top"><td className="px-4 py-2 whitespace-nowrap">{formatDateTime(d.created_at, locale)}</td><td className="px-2 py-2">{d.channel}<br />{d.event}</td><td className="ltr-nums px-2 py-2">{d.recipient}</td><td className="px-2 py-2"><StatusBadge value={d.status} label={d.status} />{d.error && <p className="mt-1 text-red-600">{d.error}</p>}</td><td className="px-4 py-2">{d.attempts}</td></tr>)}</tbody></table></div>
                    <Pagination meta={deliveries} />
                </Card>
            </div>
            {editing !== undefined && <TemplateDialog key={editing?.id ?? 'new'} template={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function TemplateDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ key: template?.key ?? '', name: template?.name ?? '', language: template?.language ?? 'en', body_preview: template?.body_preview ?? '', variable_count: String(template?.variable_count ?? 0), status: template?.status ?? 'pending' });
    const save = () => (template ? form.put(route('admin.whatsapp-templates.update', template.id), { onSuccess: onClose }) : form.post(route('admin.whatsapp-templates.store'), { onSuccess: onClose }));
    return (
        <Modal open onClose={onClose} title={t('WhatsApp template')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={save}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Event key')} value={form.data.key} onChange={(e) => form.setData('key', e.target.value)} error={form.errors.key} />
                <Input label={t('Meta template name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                <Input label={t('Variables')} type="number" min={0} max={10} value={form.data.variable_count} onChange={(e) => form.setData('variable_count', e.target.value)} />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Body preview')} value={form.data.body_preview} onChange={(e) => form.setData('body_preview', e.target.value)} error={form.errors.body_preview} />
                <Select label={t('Status')} value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} options={['pending', 'approved', 'rejected', 'disabled'].map((s) => ({ value: s, label: s }))} />
            </div>
        </Modal>
    );
}
