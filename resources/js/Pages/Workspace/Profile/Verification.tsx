import { router, useForm } from '@inertiajs/react';
import { FileText, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, LinkButton, PageHeader, Select, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Verification = { id: number; status: string; status_label: string; editable: boolean; submitted_at: string | null; information_requested: string | null; reviewer_notes: string | null; documents: { id: number; type: string; original_name: string; size: number; created_at: string }[]; events: { id: number; to: string; note: string | null; actor: string | null; created_at: string }[] };

export default function VerificationPage({ verification: v, profileComplete, documentTypes }: { verification: Verification; profileComplete: boolean; documentTypes: string[] }) {
    const t = useT();
    const { locale } = useLocale();
    const upload = useForm({ type: 'cnic_front', file: null as File | null });

    return (
        <AppLayout title={t('Verification')} wide>
            <PageHeader title={t('Lawyer verification')} description={t('Our verification team checks your Bar enrollment evidence before your profile shows the Verified badge.')} breadcrumbs={[{ label: t('Public Profile'), href: route('lawyer.profile.edit') }, { label: t('Verification') }]} actions={<StatusBadge value={v.status} label={v.status_label} />} />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {v.status === 'approved' && <Alert tone="success" title={t('You are verified')}>{t('Your Bar enrollment has been reviewed and approved.')}</Alert>}
                    {v.status === 'information_requested' && <Alert tone="warning" title={t('More information needed')}>{v.information_requested}</Alert>}
                    {v.status === 'rejected' && <Alert tone="danger" title={t('Application not approved')}>{v.reviewer_notes}</Alert>}
                    {['submitted', 'under_review'].includes(v.status) && <Alert tone="info">{t('Your application is with the verification team. Documents are locked during review.')}</Alert>}
                    {!profileComplete && <Alert tone="warning" action={<LinkButton href={route('lawyer.profile.edit', { step: 'enrollment' })} size="sm" variant="secondary">{t('Complete')}</LinkButton>}>{t('Add your Bar Council, enrollment number and category first.')}</Alert>}
                    <Card>
                        <CardHeader title={t('Evidence')} description={t('Required: CNIC (front) and Bar license. Add High Court / Supreme Court licenses and degrees if applicable.')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {v.documents.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">{t('No documents uploaded.')}</li>}
                            {v.documents.map((d) => (
                                <li key={d.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                                    <a href={route('lawyer.verification.documents.download', d.id)} className="flex items-center gap-2 hover:underline"><FileText className="size-4 text-navy-400" /><span><span className="font-medium">{t(`verification_doc.${d.type}`)}</span>, {d.original_name}, {formatBytes(d.size)}</span></a>
                                    {v.editable && <button type="button" onClick={() => router.delete(route('lawyer.verification.documents.destroy', d.id), { preserveScroll: true })} className="text-navy-400 hover:text-red-600" aria-label={t('Remove')}><Trash2 className="size-4" /></button>}
                                </li>
                            ))}
                        </ul>
                        {v.editable && (
                            <CardBody className="border-t border-navy-100 dark:border-navy-800">
                                <form onSubmit={(e) => { e.preventDefault(); upload.post(route('lawyer.verification.upload'), { forceFormData: true, preserveScroll: true, onSuccess: () => upload.reset('file') }); }} className="flex flex-wrap items-end gap-3">
                                    <Select label={t('Document type')} wrapperClassName="w-52" value={upload.data.type} onChange={(e) => upload.setData('type', e.target.value)} options={documentTypes.map((d) => ({ value: d, label: t(`verification_doc.${d}`) }))} />
                                    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-navy-300 px-3 py-2 text-sm dark:border-navy-700">
                                        <UploadCloud className="size-4" />{upload.data.file?.name ?? t('Choose PDF or image')}
                                        <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => upload.setData('file', e.target.files?.[0] ?? null)} />
                                    </label>
                                    <Button type="submit" loading={upload.processing} disabled={!upload.data.file}>{t('Upload')}</Button>
                                </form>
                                {(upload.errors.file || upload.errors.type) && <p className="mt-1 text-xs text-red-600">{upload.errors.file ?? upload.errors.type}</p>}
                            </CardBody>
                        )}
                    </Card>
                    {v.editable && (
                        <div className="flex justify-end">
                            <Button icon={<ShieldCheck className="size-4" />} disabled={!profileComplete} onClick={() => router.post(route('lawyer.verification.submit'), {}, { preserveScroll: true })}>{t('Submit for verification')}</Button>
                        </div>
                    )}
                </div>
                <Card>
                    <CardHeader title={t('History')} />
                    <CardBody>
                        <ol className="space-y-4">
                            {v.events.length === 0 && <li className="text-sm text-navy-500">—</li>}
                            {v.events.map((e) => (
                                <li key={e.id} className="text-sm">
                                    <StatusBadge value={e.to} label={t(`enums.verification.${e.to}`)} />
                                    {e.note && <p className="mt-1">{e.note}</p>}
                                    <p className="text-xs text-navy-500">{formatDateTime(e.created_at, locale)}{e.actor ? `, ${e.actor}` : ''}</p>
                                </li>
                            ))}
                        </ol>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
