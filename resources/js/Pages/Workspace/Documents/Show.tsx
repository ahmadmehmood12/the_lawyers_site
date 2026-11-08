import { router, useForm } from '@inertiajs/react';
import { Download, Eye, Lock, Share2, Trash2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, DetailList, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Doc = {
    id: number; title: string; description: string | null; category: string; category_label: string; is_confidential: boolean; mime: string | null; source: string;
    case: { id: number; title: string; reference: string } | null; client: string | null; uploaded_by: string | null;
    versions: { id: number; version: number; original_name: string; mime: string; size: number; note: string | null; uploaded_by: string; created_at: string; sha256: string }[];
    shares: { id: number; client: string; can_download: boolean; expires_at: string | null; revoked_at: string | null; active: boolean }[];
    access_logs: { id: number; action: string; user: string | null; ip: string | null; created_at: string }[];
};

export default function DocumentShow({ document: d, clients, can }: { document: Doc; clients: SelectOption[]; can: { update: boolean; share: boolean; delete: boolean } }) {
    const t = useT();
    const { locale } = useLocale();
    const [shareOpen, setShareOpen] = useState(false);
    const version = useForm({ file: null as File | null, note: '' });
    const share = useForm({ client_id: '', expires_at: '', can_download: true });
    const previewable = d.mime && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(d.mime);

    return (
        <AppLayout title={d.title}>
            <PageHeader
                title={<span className="flex items-center gap-2">{d.is_confidential && <Lock className="size-5 text-red-600" />}{d.title}</span>}
                breadcrumbs={[{ label: t('Document Vault'), href: route('documents.index') }, { label: d.title }]}
                actions={
                    <>
                        {previewable && <a href={route('documents.download', { document: d.id, inline: 1 })} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-navy-200 ring-inset dark:bg-navy-900 dark:ring-navy-700"><Eye className="size-4" />{t('Preview')}</a>}
                        <a href={route('documents.download', d.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Download className="size-4" />{t('Download')}</a>
                        {can.share && !d.is_confidential && <Button variant="secondary" icon={<Share2 className="size-4" />} onClick={() => setShareOpen(true)}>{t('Share with client')}</Button>}
                        {can.delete && <ConfirmAction href={route('documents.destroy', d.id)} method="delete" title={t('Archive this document?')} description={t('Client access is revoked. The file and its history are retained.')} trigger={(open) => <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={open} aria-label={t('Archive')} />} />}
                    </>
                }
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Versions')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {d.versions.map((v, i) => (
                                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                                    <div>
                                        <p className="font-medium">v{v.version}, {v.original_name} {i === 0 && <Badge tone="green">{t('Current')}</Badge>}</p>
                                        <p className="text-xs text-navy-500">{formatBytes(v.size)}, {v.uploaded_by}, {formatDateTime(v.created_at, locale)}{v.note ? `, ${v.note}` : ''}</p>
                                        <p className="ltr-nums text-[10px] text-navy-400" title="SHA-256">{v.sha256.slice(0, 16)}…</p>
                                    </div>
                                    <a href={route('documents.download', { document: d.id, version: v.id })} className="rounded p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Download')}><Download className="size-4" /></a>
                                </li>
                            ))}
                        </ul>
                        {can.update && (
                            <CardBody className="border-t border-navy-100 dark:border-navy-800">
                                <form onSubmit={(e) => { e.preventDefault(); version.post(route('documents.versions.store', d.id), { forceFormData: true, preserveScroll: true, onSuccess: () => version.reset() }); }} className="flex flex-wrap items-end gap-3">
                                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-navy-300 px-3 py-2 text-sm dark:border-navy-700">
                                        <UploadCloud className="size-4" />{version.data.file?.name ?? t('Upload a new version')}
                                        <input type="file" className="sr-only" onChange={(e) => version.setData('file', e.target.files?.[0] ?? null)} />
                                    </label>
                                    <Input wrapperClassName="flex-1" placeholder={t('What changed?')} value={version.data.note} onChange={(e) => version.setData('note', e.target.value)} aria-label={t('Note')} />
                                    <Button type="submit" loading={version.processing} disabled={!version.data.file}>{t('Upload')}</Button>
                                </form>
                                {version.errors.file && <p className="mt-1 text-xs text-red-600">{version.errors.file}</p>}
                            </CardBody>
                        )}
                    </Card>
                    <Card>
                        <CardHeader title={t('Access history')} />
                        <div className="max-h-80 overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {d.access_logs.map((l) => (
                                        <tr key={l.id}><td className="px-5 py-2">{formatDateTime(l.created_at, locale)}</td><td className="px-2 py-2">{l.user ?? '—'}</td><td className="px-2 py-2"><Badge>{t(`access.${l.action}`)}</Badge></td><td className="ltr-nums px-5 py-2 text-xs text-navy-500">{l.ip}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardBody>
                            <DetailList columns={1} items={[
                                { label: t('Category'), value: d.category_label },
                                { label: t('Case'), value: d.case && `${d.case.reference}, ${d.case.title}` },
                                { label: t('Client'), value: d.client },
                                { label: t('Uploaded by'), value: d.uploaded_by },
                                { label: t('Source'), value: d.source === 'client' ? t('From client') : d.source === 'draft' ? t('Legal drafting') : t('Chambers') },
                                { label: t('Description'), value: d.description },
                            ]} />
                            {d.is_confidential && <Alert tone="warning" className="mt-4">{t('Confidential: visible only to members allowed to view confidential files. It cannot be shared with clients.')}</Alert>}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Client access')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {d.shares.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">{t('Not shared.')}</li>}
                            {d.shares.map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                                    <div>
                                        <p className="font-medium">{s.client}</p>
                                        <p className="text-xs text-navy-500">{s.revoked_at ? t('Revoked :date', { date: formatDate(s.revoked_at, locale) }) : s.expires_at ? t('Expires :date', { date: formatDate(s.expires_at, locale) }) : t('No expiry')}{!s.can_download ? `, ${t('View only')}` : ''}</p>
                                    </div>
                                    {s.active && can.share && <Button size="sm" variant="ghost" onClick={() => router.delete(route('documents.shares.destroy', s.id), { preserveScroll: true })}>{t('Revoke')}</Button>}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
            <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('Share with client')} footer={<><Button variant="secondary" onClick={() => setShareOpen(false)}>{t('Cancel')}</Button><Button loading={share.processing} onClick={() => { share.transform((x) => ({ ...x, expires_at: x.expires_at || null })); share.post(route('documents.shares.store', d.id), { preserveScroll: true, onSuccess: () => setShareOpen(false) }); }}>{t('Share')}</Button></>}>
                <div className="space-y-4">
                    <Select label={t('Client')} value={share.data.client_id} onChange={(e) => share.setData('client_id', e.target.value)} options={clients} placeholder={t('Select client')} error={share.errors.client_id} />
                    <Input label={t('Access expires')} type="datetime-local" value={share.data.expires_at} onChange={(e) => share.setData('expires_at', e.target.value)} error={share.errors.expires_at} hint={t('Leave empty for no expiry. You can revoke access anytime.')} />
                    <Checkbox label={t('Allow download')} checked={share.data.can_download} onChange={(e) => share.setData('can_download', e.target.checked)} />
                </div>
            </Modal>
        </AppLayout>
    );
}
