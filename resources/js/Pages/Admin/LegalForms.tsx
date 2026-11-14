import { useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Stamp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, EmptyState, Input, PageHeader, Select, Textarea } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Field = { key: string; label: string; type: 'text' | 'textarea' | 'date'; required: boolean; source: string | null; hint: string | null };
type FormRow = { id: number; category: string; title: string; title_ur: string | null; language: string; description: string | null; body: string; fields: Field[] | null; is_active: boolean; updated_at: string };

/**
 * Admin, Legal forms: Wakalatnama and Power of Attorney templates (LegalFormTemplateController).
 * Each field becomes {{form.key}} in the document; a field can prefill from a case, client or lawyer value.
 */
export default function LegalForms({ forms, placeholders, categories }: { forms: FormRow[]; placeholders: { key: string; label: string }[]; categories: string[] }) {
    const t = useT();
    const [selected, setSelected] = useState<number | 'new' | null>(forms[0]?.id ?? 'new');
    const current = selected === 'new' ? null : forms.find((f) => f.id === selected) ?? null;
    const labels: Record<string, string> = { wakalatnama: t('Wakalatnama'), 'power-of-attorney': t('Power of attorney'), affidavit: t('Affidavit'), undertaking: t('Undertaking'), other: t('Other') };

    return (
        <AppLayout title={t('Legal forms')} area="admin" wide>
            <PageHeader title={t('Legal forms')} description={t('Wakalatnama and power of attorney templates. Lawyers only fill the details; the document is created from your wording.')}
                actions={<Button icon={<Plus className="size-4" />} onClick={() => setSelected('new')}>{t('New form')}</Button>} />
            <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <Card className="overflow-hidden xl:sticky xl:top-20">
                    {forms.length === 0 ? <EmptyState icon={<Stamp className="size-5" />} title={t('No forms yet')} /> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {forms.map((f) => (
                                <li key={f.id}>
                                    <button type="button" onClick={() => setSelected(f.id)} className={cn('w-full px-4 py-3 text-start transition', selected === f.id ? 'bg-navy-50 dark:bg-navy-800/70' : 'hover:bg-navy-50/60 dark:hover:bg-navy-800/40')}>
                                        <p className="flex items-center gap-2 text-sm font-medium">{f.title}{!f.is_active && <Badge>{t('Hidden')}</Badge>}</p>
                                        <p className="text-xs text-navy-500">{labels[f.category] ?? f.category} · {t(':count fields', { count: f.fields?.length ?? 0 })}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <FormEditor key={selected ?? 'none'} form={current} placeholders={placeholders} categories={categories} labels={labels} onCreated={() => setSelected(null)} />
            </div>
        </AppLayout>
    );
}

function FormEditor({ form: row, placeholders, categories, labels, onCreated }: { form: FormRow | null; placeholders: { key: string; label: string }[]; categories: string[]; labels: Record<string, string>; onCreated: () => void }) {
    const t = useT();
    const form = useForm({
        category: row?.category ?? 'wakalatnama', title: row?.title ?? '', title_ur: row?.title_ur ?? '', language: row?.language ?? 'en',
        description: row?.description ?? '', body: row?.body ?? '<p></p>', is_active: row?.is_active ?? true,
        fields: (row?.fields ?? []).map((f) => ({ ...f, source: f.source ?? '', hint: f.hint ?? '' })) as (Omit<Field, 'source' | 'hint'> & { source: string; hint: string })[],
    });
    const setField = (i: number, patch: Partial<(typeof form.data.fields)[number]>) => form.setData('fields', form.data.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
    const move = (i: number, d: number) => {
        const list = [...form.data.fields];
        const [item] = list.splice(i, 1);
        list.splice(i + d, 0, item);
        form.setData('fields', list);
    };
    const errorAt = (path: string) => (form.errors as Record<string, string>)[path];

    function save() {
        form.transform((d) => ({ ...d, fields: d.fields.map((f) => ({ ...f, source: f.source || null, hint: f.hint || null })) }));
        if (row) form.put(route('admin.legal-forms.update', row.id), { preserveScroll: true });
        else form.post(route('admin.legal-forms.store'), { preserveScroll: true, onSuccess: onCreated });
    }

    const insertable = [...form.data.fields.filter((f) => f.key).map((f) => ({ key: `form.${f.key}`, label: `${t('Field')}: ${f.label || f.key}` })), ...placeholders];

    return (
        <div className="space-y-5">
            <Card>
                <CardHeader title={row ? t('Edit form') : t('New form')} actions={<div className="flex gap-2">
                    {row && <ConfirmAction href={route('admin.legal-forms.destroy', row.id)} method="delete" title={t('Delete this form?')} description={t('Documents already created from it are kept.')} confirmLabel={t('Delete')} trigger={(open) => <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={open}>{t('Delete')}</Button>} />}
                    <Button loading={form.processing} onClick={save}>{t('Save form')}</Button>
                </div>} />
                <CardBody className="grid gap-4 md:grid-cols-2">
                    <Input label={t('Title (English)')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required />
                    <Input label={t('Title (Urdu)')} dir="rtl" value={form.data.title_ur} onChange={(e) => form.setData('title_ur', e.target.value)} />
                    <Select label={t('Type')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={categories.map((c) => ({ value: c, label: labels[c] ?? c }))} />
                    <Select label={t('Document language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                    <Textarea wrapperClassName="md:col-span-2" label={t('Short description for lawyers')} rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                    <Checkbox label={t('Available to lawyers')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader title={t('Details the lawyer fills in')} description={t('Each field is written into the document where you put {{form.key}}. Prefill takes the value from the chosen case, client or the lawyer’s profile.')}
                    actions={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => form.setData('fields', [...form.data.fields, { key: '', label: '', type: 'text', required: false, source: '', hint: '' }])}>{t('Add field')}</Button>} />
                <CardBody className="space-y-2">
                    {form.data.fields.length === 0 && <p className="text-sm text-navy-500">{t('No fields yet.')}</p>}
                    {form.data.fields.length > 0 && (
                        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_4.5rem_4.5rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-navy-400 lg:grid">
                            <span /><span>{t('Key')}</span><span>{t('Label')}</span><span>{t('Type')}</span><span>{t('Prefill from')}</span><span>{t('Required')}</span><span />
                        </div>
                    )}
                    {form.data.fields.map((f, i) => (
                        <div key={i} className="grid grid-cols-2 items-center gap-2 rounded-lg bg-navy-50/60 p-2 lg:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_4.5rem_4.5rem] dark:bg-navy-800/40">
                            <span className="hidden text-center text-xs font-semibold tabular-nums text-navy-400 lg:block">{i + 1}</span>
                            <input aria-label={t('Key')} value={f.key} onChange={(e) => setField(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="client_name" className={cn(controlClasses(!!errorAt(`fields.${i}.key`)), 'font-mono text-xs')} />
                            <input aria-label={t('Label')} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder={t('Client full name')} className={controlClasses(!!errorAt(`fields.${i}.label`))} />
                            <select aria-label={t('Type')} value={f.type} onChange={(e) => setField(i, { type: e.target.value as Field['type'] })} className={controlClasses(false)}>
                                <option value="text">{t('Short text')}</option><option value="textarea">{t('Long text')}</option><option value="date">{t('Date')}</option>
                            </select>
                            <select aria-label={t('Prefill from')} value={f.source} onChange={(e) => setField(i, { source: e.target.value })} className={controlClasses(false)}>
                                <option value="">{t('Nothing')}</option>
                                {placeholders.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                            <label className="flex items-center justify-center gap-1.5 text-sm"><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} className="size-4 accent-navy-900" /><span className="lg:sr-only">{t('Required')}</span></label>
                            <div className="flex justify-end gap-0.5">
                                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Move up')} className="rounded p-1 text-navy-400 hover:text-navy-800 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                                <button type="button" disabled={i === form.data.fields.length - 1} onClick={() => move(i, 1)} aria-label={t('Move down')} className="rounded p-1 text-navy-400 hover:text-navy-800 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                                <button type="button" onClick={() => form.setData('fields', form.data.fields.filter((_, j) => j !== i))} aria-label={t('Remove')} className="rounded p-1 text-navy-400 hover:text-red-600"><Trash2 className="size-4" /></button>
                            </div>
                            {(errorAt(`fields.${i}.key`) || errorAt(`fields.${i}.label`)) && <p className="col-span-full text-xs text-red-600">{errorAt(`fields.${i}.key`) ?? errorAt(`fields.${i}.label`)}</p>}
                        </div>
                    ))}
                </CardBody>
            </Card>

            <Card>
                <CardHeader title={t('Document')} description={t('Write the form as it should print. Use “Insert placeholder” to add a field or a case, client or lawyer value.')} />
                <CardBody className="space-y-3">
                    <Alert tone="info">{t('Lawyers can still edit the created document before printing. Keep a note if stamp paper or attestation is required.')}</Alert>
                    <RichTextEditor value={form.data.body} onChange={(html) => form.setData('body', html)} dir={form.data.language === 'ur' ? 'rtl' : 'ltr'} placeholders={insertable} />
                    {form.errors.body && <p className="text-xs text-red-600">{form.errors.body}</p>}
                </CardBody>
            </Card>
        </div>
    );
}
