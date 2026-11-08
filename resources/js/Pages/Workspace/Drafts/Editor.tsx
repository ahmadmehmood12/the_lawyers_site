import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, Download, FileUp, History, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Alert, Button, Card, CardBody, CardHeader, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDateTime } from '@/lib/format';
import { postJson } from '@/lib/http';
import { useLocale, useT } from '@/lib/i18n';

type Draft = { id: number; title: string; body: string; language: string; header_text: string | null; footer_text: string | null; version: number; status: string; status_label: string; case: { id: number; title: string; reference: string } | null; template: { title: string; reviewed: boolean } | null; approved_by: string | null; approved_at: string | null; versions: { version: number; note: string | null; author: string; created_at: string }[] };

export default function DraftEditor({ draft, placeholders, can }: { draft: Draft; placeholders: { key: string; label: string }[]; can: { approve: boolean; attach: boolean; ai: boolean } }) {
    const t = useT();
    const { locale } = useLocale();
    const [history, setHistory] = useState(false);
    const [ai, setAi] = useState(false);
    const form = useForm({ title: draft.title, body: draft.body, header_text: draft.header_text ?? '', footer_text: draft.footer_text ?? '', note: '' });
    const unresolved = (form.data.body.match(/\{\{[a-z_.]+\}\}/g) ?? []).length;

    return (
        <AppLayout title={draft.title} wide>
            <PageHeader
                title={draft.title}
                breadcrumbs={[{ label: t('Legal Drafting'), href: route('drafts.index') }, ...(draft.case ? [{ label: draft.case.reference, href: route('cases.show', { case: draft.case.id, tab: 'documents' }) }] : []), { label: `v${draft.version}` }]}
                description={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={draft.status} label={draft.status_label} />{draft.approved_by && <span className="text-xs">{t('Approved by :name', { name: draft.approved_by })}</span>}</span>}
                actions={
                    <>
                        {can.ai && <Button variant="secondary" icon={<Sparkles className="size-4" />} onClick={() => setAi(true)}>{t('AI assist')}</Button>}
                        <Button variant="ghost" icon={<History className="size-4" />} onClick={() => setHistory(true)}>{t('Versions')}</Button>
                        <a href={route('drafts.export', [draft.id, 'pdf'])} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-navy-200 ring-inset dark:ring-navy-700"><Download className="size-4" />PDF</a>
                        <a href={route('drafts.export', [draft.id, 'docx'])} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ring-navy-200 ring-inset dark:ring-navy-700"><Download className="size-4" />DOCX</a>
                        {can.attach && <Button variant="secondary" icon={<FileUp className="size-4" />} onClick={() => router.post(route('drafts.attach', draft.id), {}, { preserveScroll: true })}>{t('Save to case')}</Button>}
                    </>
                }
            />
            {draft.template && !draft.template.reviewed && <Alert tone="warning" className="mb-4">{t('Based on an unreviewed template. Verify the format and every legal reference before filing. Nothing is filed with any court automatically.')}</Alert>}
            {unresolved > 0 && <Alert tone="info" className="mb-4">{t(':count placeholders still need details (highlighted).', { count: unresolved })}</Alert>}
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                <div className="space-y-3">
                    <Input aria-label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} className="text-lg font-semibold" />
                    <RichTextEditor value={form.data.body} onChange={(html) => form.setData('body', html)} dir={draft.language === 'ur' ? 'rtl' : 'ltr'} placeholders={placeholders} />
                </div>
                <div className="space-y-4">
                    <Card>
                        <CardBody className="space-y-3">
                            <Input label={t('Header text')} value={form.data.header_text} onChange={(e) => form.setData('header_text', e.target.value)} />
                            <Input label={t('Footer text')} value={form.data.footer_text} onChange={(e) => form.setData('footer_text', e.target.value)} />
                            <Input label={t('Version note')} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder={t('What changed?')} />
                            <Button className="w-full" loading={form.processing} onClick={() => form.put(route('drafts.update', draft.id), { preserveScroll: true, onSuccess: () => form.setData('note', '') })}>{t('Save version')}</Button>
                            {form.errors.body && <p className="text-xs text-red-600">{form.errors.body}</p>}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Review')} />
                        <CardBody className="space-y-2">
                            {draft.status === 'draft' && <Button variant="secondary" className="w-full" icon={<Send className="size-4" />} onClick={() => router.post(route('drafts.status', draft.id), { status: 'in_review' }, { preserveScroll: true })}>{t('Send for review')}</Button>}
                            {can.approve && draft.status !== 'approved' && <Button variant="success" className="w-full" icon={<CheckCircle2 className="size-4" />} onClick={() => router.post(route('drafts.status', draft.id), { status: 'approved' }, { preserveScroll: true })}>{t('Approve')}</Button>}
                            {draft.status !== 'draft' && <Button variant="ghost" className="w-full" onClick={() => router.post(route('drafts.status', draft.id), { status: 'draft' }, { preserveScroll: true })}>{t('Back to draft')}</Button>}
                            <p className="text-xs text-navy-500">{t('Editing an approved draft returns it to draft for re-approval.')}</p>
                        </CardBody>
                    </Card>
                </div>
            </div>
            <Modal open={history} onClose={() => setHistory(false)} title={t('Version history')}>
                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                    {draft.versions.map((v) => (
                        <li key={v.version} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                            <div><p className="font-medium">v{v.version}{v.note ? `, ${v.note}` : ''}</p><p className="text-xs text-navy-500">{v.author}, {formatDateTime(v.created_at, locale)}</p></div>
                            {v.version !== draft.version && <Button size="sm" variant="ghost" onClick={() => router.post(route('drafts.restore', [draft.id, v.version]), {}, { onSuccess: () => setHistory(false) })}>{t('Restore')}</Button>}
                        </li>
                    ))}
                </ul>
            </Modal>
            {can.ai && <AiPanel open={ai} onClose={() => setAi(false)} caseId={draft.case?.id} onInsert={(text) => form.setData('body', `${form.data.body}<h3>${t('AI draft — review required')}</h3>${text.split('\n').filter(Boolean).map((l) => `<p>${l.replace(/</g, '&lt;')}</p>`).join('')}`)} />}
        </AppLayout>
    );
}

export function AiPanel({ open, onClose, caseId, onInsert }: { open: boolean; onClose: () => void; caseId?: number; onInsert?: (text: string) => void }) {
    const t = useT();
    const [feature, setFeature] = useState('draft');
    const [input, setInput] = useState('');
    const [result, setResult] = useState<{ text: string; notice: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function run() {
        setLoading(true); setError(null); setResult(null);
        const response = await postJson<{ text?: string; notice?: string; message?: string }>(route('ai.run'), { feature, input, legal_case_id: caseId ?? null });
        setLoading(false);
        if (response.ok && response.data.text) setResult({ text: response.data.text, notice: response.data.notice ?? '' });
        else setError(response.data.message ?? t('The AI request failed.'));
    }

    return (
        <Modal open={open} onClose={onClose} size="xl" title={t('AI drafting assistant')} description={t('Personal details are masked before sending. Output must be reviewed by an advocate.')} footer={<><Button variant="secondary" onClick={onClose}>{t('Close')}</Button>{result && onInsert && <Button variant="secondary" onClick={() => { onInsert(result.text); onClose(); }}>{t('Insert into draft')}</Button>}<Button icon={<Sparkles className="size-4" />} loading={loading} disabled={input.length < 10} onClick={run}>{t('Generate')}</Button></>}>
            <div className="space-y-4">
                <Select label={t('Task')} value={feature} onChange={(e) => setFeature(e.target.value)} options={['draft', 'summarize', 'chronology', 'hearing_summary', 'translate_en_ur', 'translate_ur_en', 'grammar', 'client_update', 'extract', 'research'].map((f) => ({ value: f, label: t(`ai.${f}`) }))} />
                <Textarea label={t('Input')} rows={8} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('Paste text or describe what you need…')} />
                {error && <Alert tone="danger">{error}</Alert>}
                {result && (
                    <div className="space-y-2">
                        <Alert tone="warning">{result.notice}</Alert>
                        <pre className="max-h-96 overflow-y-auto rounded-lg bg-navy-50 p-4 font-sans text-sm whitespace-pre-wrap dark:bg-navy-800">{result.text}</pre>
                    </div>
                )}
            </div>
        </Modal>
    );
}
