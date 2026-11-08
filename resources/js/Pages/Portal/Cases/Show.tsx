import { Link, useForm } from '@inertiajs/react';
import { Download, MessageSquare, Star, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, DetailList, Input, Modal, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDate, formatDateTime, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Props = {
    legalCase: { id: number; title: string; case_number: string | null; case_type: string; status: string; status_label: string; stage: string | null; court: string | null; organization: string; summary: string | null; filing_date: string | null; lawyers: { id: number; name: string; slug: string | null }[]; client_id: number | null };
    hearings: { id: number; hearing_date: string; hearing_time: string | null; status: string; status_label: string; purpose: string | null; court: string | null; client_note: string | null; order_passed: string | null; next_hearing_date: string | null }[];
    timeline: { id: number; title: string; description: string | null; occurred_at: string }[];
    documents: { id: number; title: string; category: string; size: number | null; source: string; updated_at: string }[];
};

export default function PortalCaseShow({ legalCase: c, hearings, timeline, documents }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [upload, setUpload] = useState(false);
    const [review, setReview] = useState<{ slug: string; name: string } | null>(null);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = hearings.filter((h) => h.status === 'scheduled' && h.hearing_date >= today).reverse();
    const past = hearings.filter((h) => !(h.status === 'scheduled' && h.hearing_date >= today));

    return (
        <AppLayout title={c.title} area="portal">
            <PageHeader title={c.title} breadcrumbs={[{ label: t('My Cases'), href: route('portal.cases.index') }, { label: c.case_number ?? c.title }]} description={<StatusBadge value={c.status} label={c.status_label} />}
                actions={<><Button variant="secondary" icon={<UploadCloud className="size-4" />} onClick={() => setUpload(true)}>{t('Send a document')}</Button>{c.client_id && c.lawyers[0] && <Link href={route('portal.messages.store')} method="post" as="button" data={{ client_id: c.client_id, lawyer_id: c.lawyers[0].id }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white dark:bg-gold-500 dark:text-navy-950"><MessageSquare className="size-4" />{t('Message lawyer')}</Link>}</>} />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {c.summary && <Card><CardHeader title={t('Progress from your lawyer')} /><CardBody><p className="text-sm whitespace-pre-line">{c.summary}</p></CardBody></Card>}
                    <Card>
                        <CardHeader title={t('Upcoming hearings')} />
                        <CardBody className="space-y-2">
                            {upcoming.length === 0 && <p className="text-sm text-navy-500">{t('No upcoming hearing has been shared.')}</p>}
                            {upcoming.map((h) => <div key={h.id} className="rounded-lg bg-gold-50 p-3 text-sm dark:bg-gold-700/10"><p className="font-semibold">{formatDate(h.hearing_date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{h.hearing_time ? `, ${formatTime(h.hearing_time, locale)}` : ''}</p><p className="text-navy-600 dark:text-navy-300">{[h.court, h.purpose].filter(Boolean).join(', ')}</p></div>)}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Previous hearings')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {past.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                            {past.map((h) => (
                                <li key={h.id} className="space-y-1 px-5 py-3 text-sm">
                                    <div className="flex items-center justify-between"><p className="font-medium">{formatDate(h.hearing_date, locale)}</p><StatusBadge value={h.status} label={h.status_label} /></div>
                                    {h.client_note && <p>{h.client_note}</p>}
                                    {h.order_passed && <p className="text-navy-600 dark:text-navy-300"><span className="font-medium">{t('Order')}:</span> {h.order_passed}</p>}
                                    {h.next_hearing_date && <p className="text-xs text-navy-500">{t('Next date')}: {formatDate(h.next_hearing_date, locale)}</p>}
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card>
                        <CardHeader title={t('Case timeline')} />
                        <CardBody>
                            <ol className="space-y-3 border-s border-navy-200 ps-4 dark:border-navy-700">
                                {timeline.map((e) => <li key={e.id} className="text-sm"><p className="font-medium">{e.title}</p>{e.description && <p className="text-navy-600 dark:text-navy-300">{e.description}</p>}<p className="text-xs text-navy-500">{formatDateTime(e.occurred_at, locale)}</p></li>)}
                            </ol>
                        </CardBody>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card><CardBody><DetailList columns={1} items={[{ label: t('Court'), value: c.court }, { label: t('Case number'), value: <span className="ltr-nums">{c.case_number}</span> }, { label: t('Type'), value: c.case_type }, { label: t('Stage'), value: c.stage }, { label: t('Filed'), value: c.filing_date && formatDate(c.filing_date, locale) }, { label: t('Chambers'), value: c.organization }]} /></CardBody></Card>
                    <Card>
                        <CardHeader title={t('Lawyers')} />
                        <CardBody className="space-y-2 text-sm">
                            {c.lawyers.map((l) => (
                                <div key={l.id} className="flex items-center justify-between gap-2">
                                    {l.slug ? <Link href={route('lawyers.show', l.slug)} className="font-medium hover:underline">{l.name}</Link> : <span>{l.name}</span>}
                                    {l.slug && <Button size="sm" variant="ghost" icon={<Star className="size-3.5" />} onClick={() => setReview({ slug: l.slug!, name: l.name })}>{t('Review')}</Button>}
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Documents')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {documents.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                            {documents.map((d) => <li key={d.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm"><div><p className="font-medium">{d.title}</p><p className="text-xs text-navy-500">{d.category}{d.size ? `, ${formatBytes(d.size)}` : ''}{d.source === 'client' ? `, ${t('Sent by you')}` : ''}</p></div><a href={route('portal.documents.download', d.id)} aria-label={t('Download')} className="rounded p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800"><Download className="size-4" /></a></li>)}
                        </ul>
                    </Card>
                </div>
            </div>
            <UploadDialog open={upload} onClose={() => setUpload(false)} caseId={c.id} />
            <ReviewDialog lawyer={review} onClose={() => setReview(null)} />
        </AppLayout>
    );
}

function UploadDialog({ open, onClose, caseId }: { open: boolean; onClose: () => void; caseId: number }) {
    const t = useT();
    const form = useForm({ legal_case_id: caseId, title: '', file: null as File | null });
    return (
        <Modal open={open} onClose={onClose} title={t('Send a document to your lawyer')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} disabled={!form.data.file} onClick={() => form.post(route('portal.documents.store'), { forceFormData: true, preserveScroll: true, onSuccess: () => { form.reset('title', 'file'); onClose(); } })}>{t('Send')}</Button></>}>
            <div className="space-y-4">
                <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                <input type="file" accept=".pdf,.docx,image/*" onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)} className="block w-full text-sm" aria-label={t('File')} />
                {form.errors.file && <p className="text-xs text-red-600">{form.errors.file}</p>}
            </div>
        </Modal>
    );
}

export function ReviewDialog({ lawyer, onClose }: { lawyer: { slug: string; name: string } | null; onClose: () => void }) {
    const t = useT();
    const form = useForm({ rating: 5, title: '', comment: '' });
    return (
        <Modal open={!!lawyer} onClose={onClose} title={t('Review :name', { name: lawyer?.name ?? '' })} description={t('Reviews are published after moderation. Please be fair and factual.')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => lawyer && form.post(route('portal.reviews.store', lawyer.slug), { preserveScroll: true, onSuccess: onClose })}>{t('Submit review')}</Button></>}>
            <div className="space-y-4">
                <div className="flex gap-1" role="radiogroup" aria-label={t('Rating')}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={form.data.rating === n} onClick={() => form.setData('rating', n)}><Star className={`size-7 ${n <= form.data.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200'}`} /></button>)}</div>
                <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                <Textarea label={t('Your experience')} value={form.data.comment} onChange={(e) => form.setData('comment', e.target.value)} error={form.errors.comment} />
            </div>
        </Modal>
    );
}
