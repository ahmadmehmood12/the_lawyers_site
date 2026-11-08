import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Badge, Button, Card, DataTable, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Row = {
    id: number;
    reference: string;
    kind: 'contact' | 'feedback';
    kind_label: string;
    account_type: string | null;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    category: string | null;
    body: string;
    status: 'new' | 'in_progress' | 'resolved';
    admin_note: string | null;
    handler: string | null;
    handled_at: string | null;
    whatsapp: string | null;
    whatsapp_error: string | null;
    created_at: string;
};

const statusTone = { new: 'amber', in_progress: 'navy', resolved: 'green' } as const;

export default function Support({ messages, filters, kinds, statuses, counts }: { messages: Paginated<Row>; filters: Record<string, string>; kinds: Option[]; statuses: Option[]; counts: Record<string, number> }) {
    const t = useT();
    const { locale } = useLocale();
    const [open, setOpen] = useState<Row | null>(null);
    const statusLabel = (value: string) => statuses.find((s) => s.value === value)?.label ?? value;
    const visit = (p: Record<string, string | undefined>) => router.get(route('admin.feedback.index'), { ...filters, ...p, page: undefined }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Feedback and messages')} area="admin" wide>
            <PageHeader title={t('Feedback and messages')} description={t('Contact-us messages and feedback from clients, lawyers, firms and staff. Only platform admins can see this inbox.')} />
            <div className="mb-4 flex flex-wrap gap-6 text-sm">
                {statuses.map((s) => (
                    <p key={s.value}>
                        <span className="text-2xl font-semibold tabular-nums">{counts[s.value] ?? 0}</span> <span className="text-navy-500 dark:text-navy-400">{s.label}</span>
                    </p>
                ))}
            </div>
            <Card>
                <DataTable
                    rows={messages}
                    filters={filters}
                    searchPlaceholder={t('Reference, name, email or subject')}
                    toolbar={
                        <>
                            <Select aria-label={t('Type')} wrapperClassName="w-40" value={filters.kind ?? ''} onChange={(e) => visit({ kind: e.target.value || undefined })} options={kinds} placeholder={t('All types')} />
                            <Select aria-label={t('Status')} wrapperClassName="w-40" value={filters.status ?? ''} onChange={(e) => visit({ status: e.target.value || undefined })} options={statuses} placeholder={t('All statuses')} />
                        </>
                    }
                    empty={t('No messages yet.')}
                    columns={[
                        { key: 'reference', label: t('Reference'), render: (r) => <button type="button" className="ltr-nums font-medium text-navy-900 underline-offset-2 hover:underline dark:text-white" onClick={() => setOpen(r)}>{r.reference}</button> },
                        { key: 'from', label: t('From'), render: (r) => (<div><p className="font-medium">{r.name}</p><p className="text-xs text-navy-500">{r.email}{r.account_type ? `, ${r.account_type}` : ''}</p></div>) },
                        { key: 'subject', label: t('Subject'), render: (r) => (<div className="max-w-sm"><p className="truncate">{r.subject}</p><p className="text-xs text-navy-500">{r.kind_label}{r.category ? `, ${r.category}` : ''}</p></div>) },
                        { key: 'created_at', label: t('Received'), hideOnMobile: true, render: (r) => formatDateTime(r.created_at, locale) },
                        { key: 'status', label: t('Status'), render: (r) => <Badge tone={statusTone[r.status]}>{statusLabel(r.status)}</Badge> },
                        { key: 'actions', label: '', render: (r) => <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setOpen(r)}>{t('Open')}</Button></div> },
                    ]}
                />
            </Card>
            {open && <MessageDialog message={open} statuses={statuses} onClose={() => setOpen(null)} />}
        </AppLayout>
    );
}

function MessageDialog({ message, statuses, onClose }: { message: Row; statuses: Option[]; onClose: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ status: message.status, admin_note: message.admin_note ?? '' });
    const whatsappLabel: Record<string, string> = { sent: t('Sent'), delivered: t('Delivered'), read: t('Read'), queued: t('Queued'), failed: t('Failed'), skipped: t('Skipped') };

    return (
        <Modal open onClose={onClose} title={`${message.reference}, ${message.subject}`} size="lg">
            <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-navy-500">{t('From')}</dt><dd className="font-medium">{message.name}</dd></div>
                    <div><dt className="text-navy-500">{t('Received')}</dt><dd>{formatDateTime(message.created_at, locale)}</dd></div>
                    <div><dt className="text-navy-500">{t('Email')}</dt><dd><a className="underline" href={`mailto:${message.email}?subject=${encodeURIComponent(message.reference)}`}>{message.email}</a></dd></div>
                    <div><dt className="text-navy-500">{t('Phone')}</dt><dd className="ltr-nums">{message.phone ?? '—'}</dd></div>
                    <div><dt className="text-navy-500">{t('Email confirmation')}</dt><dd>{t('Queued to the sender’s email')}</dd></div>
                    <div>
                        <dt className="text-navy-500">{t('WhatsApp confirmation')}</dt>
                        <dd>{message.whatsapp ? whatsappLabel[message.whatsapp] ?? message.whatsapp : t('Not requested')}{message.whatsapp_error ? ` (${message.whatsapp_error})` : ''}</dd>
                    </div>
                </dl>
                <p className="rounded-lg bg-navy-50 p-4 text-sm whitespace-pre-line dark:bg-navy-800/60">{message.body}</p>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                    <Select label={t('Status')} value={form.data.status} onChange={(e) => form.setData('status', e.target.value as Row['status'])} options={statuses} error={form.errors.status} />
                    <Textarea label={t('Internal note')} rows={3} value={form.data.admin_note} onChange={(e) => form.setData('admin_note', e.target.value)} error={form.errors.admin_note} hint={t('Visible to admins only.')} />
                </div>
                {message.handler && <p className="text-xs text-navy-500">{t('Last handled by :name', { name: message.handler })}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>{t('Close')}</Button>
                    <Button loading={form.processing} onClick={() => form.put(route('admin.feedback.update', message.id), { preserveScroll: true, onSuccess: onClose })}>{t('Save')}</Button>
                </div>
            </div>
        </Modal>
    );
}
