import { router, useForm } from '@inertiajs/react';
import { ExternalLink, FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Row = { id: number; slug: string; court: string; court_name: string; case_type: string; case_number: string; title: string; judges: string; bench: boolean; bench_label: string | null; apex_court_case: string | null; apex_court_status: string | null; citation: string | null; other_citation: string | null; sc_citation: string | null; tag_line: string | null; remarks: string | null; decision_date: string | null; uploaded_on: string; pdf_url: string | null; pdf_is_link: boolean; is_reported: boolean; cited_citations: string[]; source_url: string | null; is_published: boolean; views: number };

const fileClasses = 'block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100';

/** Admin, Reported judgments (Admin\ReportedJudgmentController): add one by one or import a CSV. */
export default function Judgments({ rows, courts, counts, filters, csvColumns }: { rows: Paginated<Row>; courts: SelectOption[]; counts: Record<string, number>; filters: Record<string, string>; csvColumns: string[] }) {
    const t = useT();
    const { locale } = useLocale();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    const [importing, setImporting] = useState(false);

    return (
        <AppLayout title={t('Reported judgments')} area="admin" wide>
            <PageHeader title={t('Reported judgments')} description={t('Judgments approved for reporting, shown on the public Judgments page High Court wise.')}
                actions={<div className="flex gap-2"><a href={route('judgments.index')} target="_blank" rel="noreferrer"><Button variant="ghost" icon={<ExternalLink className="size-4" />}>{t('View page')}</Button></a><Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setImporting(true)}>{t('Import CSV')}</Button><Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('Add judgment')}</Button></div>} />
            <div className="mb-4 flex flex-wrap gap-1.5">
                {[{ value: '', label: t('All courts') }, ...courts].map((c) => (
                    <button key={String(c.value)} type="button" onClick={() => router.get(route('admin.judgments.index'), { ...filters, court: c.value || undefined }, { preserveState: true })}
                        className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', (filters.court ?? '') === c.value && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>
                        {c.label} <span className="tabular-nums opacity-70">({c.value ? counts[String(c.value)] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)})</span>
                    </button>
                ))}
            </div>
            <Card>
                <DataTable rows={rows} filters={filters} searchPlaceholder={t('Search party names')} empty={t('No judgments yet. Add one or import a CSV.')}
                    columns={[
                        { key: 'case', label: t('Case'), render: (r) => (
                            <div className="max-w-xl">
                                <p className="font-medium">{r.case_type} {r.case_number}</p>
                                <p className="text-sm text-navy-600 dark:text-navy-300">{r.title}</p>
                                <p className="text-xs text-navy-500">{r.judges}</p>
                            </div>
                        ) },
                        { key: 'court', label: t('Court'), hideOnMobile: true, render: (r) => <Badge>{r.court.toUpperCase()}</Badge> },
                        { key: 'uploaded_on', label: t('Uploaded'), hideOnMobile: true, render: (r) => formatDate(r.uploaded_on, locale) },
                        { key: 'files', label: t('Text'), hideOnMobile: true, render: (r) => r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline"><FileText className="size-4 text-red-600" />PDF</a> : r.source_url ? <a href={r.source_url} target="_blank" rel="noreferrer" className="text-sm underline">{t('Source')}</a> : <span className="text-navy-400">—</span> },
                        { key: 'status', label: t('Status'), render: (r) => <span className="flex flex-wrap gap-1"><Badge tone={r.is_published ? 'green' : 'neutral'}>{r.is_published ? t('Public') : t('Hidden')}</Badge>{!r.is_reported && <Badge tone="amber">{t('Unreported')}</Badge>}</span> },
                        { key: 'actions', label: '', render: (r) => (
                            <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                                <ConfirmAction href={route('admin.judgments.destroy', r.id)} method="delete" title={t('Remove this judgment?')} confirmLabel={t('Remove')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Remove')} onClick={open}><Trash2 className="size-4" /></Button>} />
                            </div>
                        ) },
                    ]} />
            </Card>
            {editing !== undefined && <JudgmentDialog key={editing?.id ?? 'new'} row={editing} courts={courts} defaultCourt={filters.court} onClose={() => setEditing(undefined)} />}
            <ImportDialog open={importing} onClose={() => setImporting(false)} columns={csvColumns} />
        </AppLayout>
    );
}

function JudgmentDialog({ row, courts, defaultCourt, onClose }: { row: Row | null; courts: SelectOption[]; defaultCourt?: string; onClose: () => void }) {
    const t = useT();
    const form = useForm<{ court: string; case_type: string; case_number: string; title: string; judges: string; bench: boolean; apex_court_case: string; apex_court_status: string; citation: string; other_citation: string; sc_citation: string; tag_line: string; remarks: string; decision_date: string; uploaded_on: string; pdf_link: string; source_url: string; is_published: boolean; is_reported: boolean; pdf: File | null; remove_pdf: boolean; text_mode: 'pdf' | 'link' }>({
        text_mode: row?.pdf_url && !row.pdf_is_link ? 'pdf' : 'link',
        pdf_link: row?.pdf_is_link ? row.pdf_url ?? '' : '',
        court: row?.court ?? defaultCourt ?? 'lhc', case_type: row?.case_type ?? '', case_number: row?.case_number ?? '', title: row?.title ?? '', judges: row?.judges ?? '',
        bench: row?.bench ?? false, apex_court_case: row?.apex_court_case ?? '', apex_court_status: row?.apex_court_status ?? '',
        citation: row?.citation ?? '', other_citation: row?.other_citation ?? '', sc_citation: row?.sc_citation ?? '', tag_line: row?.tag_line ?? '', remarks: row?.remarks ?? '', decision_date: row?.decision_date ?? '', uploaded_on: row?.uploaded_on ?? new Date().toISOString().slice(0, 10),
        source_url: row?.source_url ?? '', is_published: row?.is_published ?? true, is_reported: row?.is_reported ?? true, pdf: null, remove_pdf: false,
    });
    function submit() {
        form.transform((d) => ({ ...d, apex_court_case: d.apex_court_case || null, apex_court_status: d.apex_court_status || null, citation: d.citation || null, other_citation: d.other_citation || null, sc_citation: d.sc_citation || null, tag_line: d.tag_line || null, remarks: d.remarks || null, decision_date: d.decision_date || null, pdf_link: d.pdf_link || null, source_url: d.source_url || null }));
        const options = { forceFormData: true, preserveScroll: true, onSuccess: onClose };
        if (row) form.post(route('admin.judgments.update', row.id), options);
        else form.post(route('admin.judgments.store'), options);
    }
    return (
        <Modal open onClose={onClose} size="lg" title={row ? t('Edit judgment') : t('Add judgment')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t('Court')} value={form.data.court} onChange={(e) => form.setData('court', e.target.value)} options={courts} error={form.errors.court} />
                <Input label={t('Case type')} value={form.data.case_type} onChange={(e) => form.setData('case_type', e.target.value)} error={form.errors.case_type} placeholder={t('e.g. Civil Revision')} required />
                <Input label={t('Case number')} value={form.data.case_number} onChange={(e) => form.setData('case_number', e.target.value)} error={form.errors.case_number} placeholder="27111/19" required />
                <Input label={t('Citation')} value={form.data.citation} onChange={(e) => form.setData('citation', e.target.value)} error={form.errors.citation} placeholder="2026 LHC 1234" />
                <Input wrapperClassName="sm:col-span-2" label={t('Title (parties)')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} placeholder="Jannat Begum etc Vs Province of the Punjab etc" required />
                <Input wrapperClassName="sm:col-span-2" label={t('Judge or bench')} value={form.data.judges} onChange={(e) => form.setData('judges', e.target.value)} error={form.errors.judges} placeholder="Mr. Justice ..." required />
                <Input label={t('SC citation')} value={form.data.sc_citation} onChange={(e) => form.setData('sc_citation', e.target.value)} error={form.errors.sc_citation} placeholder="2018 SCP 131" hint={t('Supreme Court judgments only.')} />
                <Input label={t('Other citation')} value={form.data.other_citation} onChange={(e) => form.setData('other_citation', e.target.value)} error={form.errors.other_citation} placeholder="2016 YLR 1229" hint={t('The judgment’s citation in a law report, besides the court’s neutral citation.')} />
                <Input label={t('Apex court case')} value={form.data.apex_court_case} onChange={(e) => form.setData('apex_court_case', e.target.value)} error={form.errors.apex_court_case} placeholder="Crl.P.L.A. 172-K/2025" hint={t('Supreme Court appeal reference, if any (Sindh High Court).')} />
                <Input label={t('Apex court status')} value={form.data.apex_court_status} onChange={(e) => form.setData('apex_court_status', e.target.value)} error={form.errors.apex_court_status} placeholder={t('e.g. Pending, Dismissed')} />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Tag line')} rows={2} value={form.data.tag_line} onChange={(e) => form.setData('tag_line', e.target.value)} error={form.errors.tag_line} />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Remarks (headnote)')} rows={5} value={form.data.remarks} onChange={(e) => form.setData('remarks', e.target.value)} error={form.errors.remarks} />
                <Input label={t('Decision date')} type="date" value={form.data.decision_date} onChange={(e) => form.setData('decision_date', e.target.value)} error={form.errors.decision_date} />
                <Input label={t('Uploaded on')} type="date" value={form.data.uploaded_on} onChange={(e) => form.setData('uploaded_on', e.target.value)} error={form.errors.uploaded_on} required />
                <fieldset className="space-y-3 sm:col-span-2">
                    <legend className="text-sm font-medium">{t('Judgment text')}</legend>
                    <div className="inline-flex rounded-lg bg-navy-50 p-1 text-sm dark:bg-navy-800" role="radiogroup">
                        {([['link', t('Add a link')], ['pdf', t('Upload a PDF')]] as const).map(([mode, label]) => (
                            <button key={mode} type="button" role="radio" aria-checked={form.data.text_mode === mode} onClick={() => form.setData('text_mode', mode)}
                                className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition', form.data.text_mode === mode ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-navy-500 hover:text-navy-800')}>
                                {mode === 'link' ? <ExternalLink className="size-4" /> : <FileText className="size-4" />}{label}
                            </button>
                        ))}
                    </div>
                    {form.data.text_mode === 'link' ? (
                        <Input label={t('PDF link')} type="url" value={form.data.pdf_link} onChange={(e) => form.setData('pdf_link', e.target.value)} error={form.errors.pdf_link} placeholder="https://sys.lhc.gov.pk/appjudgments/2026LHC1234.pdf"
                            hint={t('Direct link to the judgment PDF on the court website. An empty citation fills itself from an LHC file name.')} />
                    ) : (
                        <div className="space-y-1.5">
                            {row?.pdf_url && !row.pdf_is_link && <p className="flex items-center gap-3 text-sm"><a href={row.pdf_url} target="_blank" rel="noreferrer" className="underline">{t('Current PDF')}</a><span className="text-navy-500">{t('Choose a new file only to replace it.')}</span></p>}
                            <input type="file" accept="application/pdf" className={fileClasses} onChange={(e) => form.setData('pdf', e.target.files?.[0] ?? null)} aria-label={t('Judgment PDF')} />
                            {form.errors.pdf ? <p className="text-xs text-red-600">{form.errors.pdf}</p> : <p className="text-xs text-navy-500">{t('PDF up to 20 MB.')}</p>}
                        </div>
                    )}
                    <Input label={t('Source page link')} type="url" value={form.data.source_url} onChange={(e) => form.setData('source_url', e.target.value)} error={form.errors.source_url} placeholder="https://"
                        hint={form.data.text_mode === 'link' ? t('Optional. The court page where the judgment is listed. Add the PDF link, this page, or both.') : t('Optional. The court page where the judgment is listed.')} />
                    {row && ((form.data.text_mode === 'link' && row.pdf_url && !row.pdf_is_link) || (form.data.text_mode === 'pdf' && row.pdf_is_link)) && (
                        <p className="text-xs text-gold-700 dark:text-gold-300">{form.data.text_mode === 'link' ? t('Saving removes the uploaded PDF and uses the link instead.') : t('Saving replaces the PDF link with the uploaded file.')}</p>
                    )}
                    {row && row.cited_citations.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-navy-500">{t('Case law cited in the PDF (:count)', { count: row.cited_citations.length })}</p>
                            <div className="flex flex-wrap gap-1.5">{row.cited_citations.map((c) => <Badge key={c}>{c}</Badge>)}</div>
                        </div>
                    )}
                </fieldset>
                <Checkbox label={t('Show on the public page')} checked={form.data.is_published} onChange={(e) => form.setData('is_published', e.target.checked)} />
                <Checkbox label={t('Reported judgment (approved for reporting)')} checked={form.data.is_reported} onChange={(e) => form.setData('is_reported', e.target.checked)} />
                <Checkbox label={t('Division Bench (D.B.) — otherwise Single Bench')} checked={form.data.bench} onChange={(e) => form.setData('bench', e.target.checked)} />
            </div>
        </Modal>
    );
}

function ImportDialog({ open, onClose, columns }: { open: boolean; onClose: () => void; columns: string[] }) {
    const t = useT();
    const form = useForm<{ file: File | null }>({ file: null });
    return (
        <Modal open={open} onClose={onClose} title={t('Import judgments from CSV')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} disabled={!form.data.file} onClick={() => form.post(route('admin.judgments.import'), { forceFormData: true, onSuccess: () => { form.reset(); onClose(); } })}>{t('Import')}</Button></>}>
            <div className="space-y-4 text-sm">
                <p>{t('Use a CSV file with this header row. Court is one of lhc, shc, phc, bhc, ihc or scp. Dates as YYYY-MM-DD. Rows with the same court, case number and title are updated.')}</p>
                <code className="block overflow-x-auto rounded-lg bg-navy-50 p-3 font-mono text-xs dark:bg-navy-800">{columns.join(',')}</code>
                <input type="file" accept=".csv,text/csv" className={fileClasses} onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)} aria-label={t('CSV file')} />
                {form.errors.file && <p className="text-xs text-red-600">{form.errors.file}</p>}
            </div>
        </Modal>
    );
}
