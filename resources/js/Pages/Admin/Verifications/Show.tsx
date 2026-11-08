import { useForm } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, DetailList, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export default function VerificationShow({ verification: v, canDecide }: { verification: Record<string, any>; canDecide: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ status: '', note: '' });
    const act = (status: string) => { form.transform((d) => ({ ...d, status })); form.post(route('admin.verifications.transition', v.id), { preserveScroll: true, onSuccess: () => form.reset() }); };
    const l = v.lawyer;
    return (
        <AppLayout title={t('Verification')} area="admin">
            <PageHeader title={l.name} breadcrumbs={[{ label: t('Verification'), href: route('admin.verifications.index') }, { label: l.name }]} description={<StatusBadge value={v.status} label={v.status_label} />} />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card><CardHeader title={t('Claimed details')} /><CardBody><DetailList columns={2} items={[{ label: t('Email'), value: l.email }, { label: t('Phone'), value: <span className="ltr-nums">{l.phone}</span> }, { label: t('CNIC'), value: <span className="ltr-nums">{l.cnic}</span> }, { label: t('Bar Council'), value: l.bar_council }, { label: t('Enrollment no.'), value: <span className="ltr-nums">{l.enrollment_number}</span> }, { label: t('Enrollment date'), value: l.enrollment_date }, { label: t('Category'), value: l.category }, { label: t('Practising since'), value: l.practice_since }, { label: t('City'), value: l.city }, { label: t('Education'), value: l.educations.map((e: any) => `${e.degree}, ${e.institution}`).join('; ') }]} /></CardBody></Card>
                    <Card>
                        <CardHeader title={t('Evidence')} description={t('Every view is logged.')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">{v.documents.map((d: any) => <li key={d.id}><a href={route('admin.verifications.document', d.id)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 text-sm hover:bg-navy-50 dark:hover:bg-navy-800"><FileText className="size-4 text-navy-400" /><span className="font-medium">{t(`verification_doc.${d.type}`)}</span>, {d.original_name}, {formatBytes(d.size)}</a></li>)}</ul>
                    </Card>
                    <Alert tone="info">{t('Approve only after checking the evidence against the Bar Council record. Approval shows a “Verified” badge publicly.')}</Alert>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Decision')} />
                        <CardBody className="space-y-3">
                            <Textarea label={t('Note to lawyer / internal note')} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note ?? form.errors.status} />
                            {v.status === 'submitted' && <Button variant="secondary" className="w-full" loading={form.processing} onClick={() => act('under_review')}>{t('Start review')}</Button>}
                            {canDecide && ['submitted', 'under_review'].includes(v.status) && (<>
                                <Button variant="success" className="w-full" loading={form.processing} onClick={() => act('approved')}>{t('Approve')}</Button>
                                <Button variant="secondary" className="w-full" loading={form.processing} onClick={() => act('information_requested')}>{t('Request more information')}</Button>
                                <Button variant="danger" className="w-full" loading={form.processing} onClick={() => act('rejected')}>{t('Reject')}</Button>
                            </>)}
                            {canDecide && v.status === 'approved' && <Button variant="danger" className="w-full" onClick={() => act('suspended')}>{t('Suspend verification')}</Button>}
                            {canDecide && v.status === 'suspended' && <Button variant="success" className="w-full" onClick={() => act('approved')}>{t('Reinstate')}</Button>}
                        </CardBody>
                    </Card>
                    <Card><CardHeader title={t('History')} /><CardBody><ol className="space-y-3 text-sm">{v.events.map((e: any) => <li key={e.id}><StatusBadge value={e.to} label={t(`enums.verification.${e.to}`)} />{e.note && <p className="mt-1">{e.note}</p>}<p className="text-xs text-navy-500">{e.actor}, {formatDateTime(e.created_at, locale)}</p></li>)}</ol></CardBody></Card>
                </div>
            </div>
        </AppLayout>
    );
}
