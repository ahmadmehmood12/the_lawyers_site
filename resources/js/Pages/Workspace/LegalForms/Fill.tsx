import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileCheck2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, Input, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Field = { key: string; label: string; type: 'text' | 'textarea' | 'date'; required?: boolean; source?: string | null; hint?: string | null };
type FormDef = { id: number; title: string; category: string; language: string; description: string | null; body: string; fields: Field[] };

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Fill a Wakalatnama or Power of Attorney with a live preview; creates an editable draft. */
export default function FillLegalForm({ form: def, cases, clients, values: initial, caseId }: { form: FormDef; cases: SelectOption[]; clients: SelectOption[]; values: Record<string, string | null>; caseId: number | null }) {
    const t = useT();
    const prefill = (vals: Record<string, string | null>) => Object.fromEntries(def.fields.map((f) => [f.key, (f.source && vals[f.source]) || '']));
    const [known, setKnown] = useState(initial);
    const form = useForm({ title: `${def.title}`, case_id: caseId ? String(caseId) : '', client_id: '', values: prefill(initial) as Record<string, string> });
    const [loading, setLoading] = useState(false);

    function refill(caseValue: string, clientValue: string) {
        setLoading(true);
        const params = new URLSearchParams({ ...(caseValue ? { case_id: caseValue } : {}), ...(clientValue ? { client_id: clientValue } : {}) });
        fetch(`${route('legal-forms.prefill', def.id)}?${params}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { values: Record<string, string | null> }) => {
                setKnown(data.values);
                const next = prefill(data.values);
                form.setData('values', Object.fromEntries(def.fields.map((f) => [f.key, next[f.key] || form.data.values[f.key] || ''])));
                const title = data.values['case.title'] || data.values['client.name'];
                if (title) form.setData((d) => ({ ...d, title: `${def.title}, ${title}` }));
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (caseId) refill(String(caseId), '');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const preview = useMemo(() => def.body.replace(/\{\{\s*([a-z_.]+)\s*\}\}/g, (_, key: string) => {
        const value = key.startsWith('form.') ? form.data.values[key.slice(5)] : known[key];
        return value ? escape(value).replace(/\n/g, '<br>') : `<span class="placeholder">${key.startsWith('form.') ? escape(def.fields.find((f) => f.key === key.slice(5))?.label ?? key) : escape(key)}</span>`;
    }), [def.body, def.fields, form.data.values, known]);

    const missing = def.fields.filter((f) => f.required && !form.data.values[f.key]?.trim()).length;

    return (
        <AppLayout title={def.title} wide>
            <Link href={route('legal-forms.index')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-navy-600 hover:underline dark:text-navy-300"><ArrowLeft className="size-4 rtl:rotate-180" />{t('Wakalatnama & POA')}</Link>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-semibold">{def.title}</h1>
                    {def.description && <p className="mt-1 max-w-2xl text-navy-600 dark:text-navy-300">{def.description}</p>}
                </div>
                <Button size="lg" icon={<FileCheck2 className="size-5" />} loading={form.processing} disabled={missing > 0} onClick={() => form.post(route('legal-forms.store', def.id))}>
                    {missing > 0 ? t(':count details missing', { count: missing }) : t('Create document')}
                </Button>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Card>
                        <CardHeader title={t('1. Fill from')} description={t('Choose the case or client and the details fill themselves.')} actions={loading ? <Wand2 className="size-4 animate-pulse text-gold-600" /> : undefined} />
                        <CardBody className="space-y-4">
                            <Select label={t('Case')} value={form.data.case_id} onChange={(e) => { form.setData('case_id', e.target.value); refill(e.target.value, form.data.client_id); }} options={cases} placeholder={t('No case')} />
                            <Select label={t('Client')} value={form.data.client_id} onChange={(e) => { form.setData('client_id', e.target.value); refill(form.data.case_id, e.target.value); }} options={clients} placeholder={t('Client of the case')} />
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('2. Check the details')} description={t('Anything you change here goes into the document.')} />
                        <CardBody className="space-y-4">
                            {def.fields.map((f) => {
                                const props = {
                                    label: f.label, value: form.data.values[f.key] ?? '', required: f.required, hint: f.hint ?? undefined,
                                    error: (form.errors as Record<string, string>)[`values.${f.key}`],
                                    onChange: (e: { target: { value: string } }) => form.setData('values', { ...form.data.values, [f.key]: e.target.value }),
                                };
                                return f.type === 'textarea' ? <Textarea key={f.key} rows={2} {...props} /> : <Input key={f.key} type={f.type === 'date' ? 'date' : 'text'} {...props} />;
                            })}
                            <Input label={t('Save as')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required />
                        </CardBody>
                    </Card>
                    <Alert tone="info">{t('After creating, the document opens in the editor where you can change the wording, print it or export it as PDF or Word.')}</Alert>
                </div>

                <div className="xl:sticky xl:top-20">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">{t('Live preview')}</p>
                    <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-xl bg-navy-100/60 p-4 sm:p-8 dark:bg-navy-950">
                        <article dir={def.language === 'ur' ? 'rtl' : undefined} className="prose-legal mx-auto min-h-[60rem] max-w-[46rem] bg-white px-8 py-10 text-navy-950 shadow-lg sm:px-14 [&_.placeholder]:rounded [&_.placeholder]:bg-gold-100 [&_.placeholder]:px-1 [&_.placeholder]:text-gold-700"
                            dangerouslySetInnerHTML={{ __html: preview }} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
