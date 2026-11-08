import { useForm } from '@inertiajs/react';
import { FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Template = { id: number; category: string; title: string; description: string | null; review_status: string; language: string; own: boolean };

export default function DraftCreate({ templates, cases, clients, preset }: { templates: Template[]; cases: SelectOption[]; clients: SelectOption[]; preset: { legal_case_id: number | null } }) {
    const t = useT();
    const [category, setCategory] = useState('all');
    const form = useForm({ title: '', document_template_id: '', legal_case_id: preset.legal_case_id ? String(preset.legal_case_id) : '', client_id: '', language: 'en' });
    const categories = useMemo(() => ['all', ...new Set(templates.map((tp) => tp.category))], [templates]);
    const selected = templates.find((tp) => String(tp.id) === form.data.document_template_id);

    return (
        <AppLayout title={t('New draft')}>
            <PageHeader title={t('New draft')} breadcrumbs={[{ label: t('Legal Drafting'), href: route('drafts.index') }, { label: t('New') }]} />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Choose a template')} description={t('Placeholders are filled from the selected case and client.')} />
                    <CardBody>
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {categories.map((c) => <button key={c} type="button" onClick={() => setCategory(c)} className={cn('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', category === c ? 'bg-navy-900 text-white ring-navy-900' : 'ring-navy-200 dark:ring-navy-700')}>{c === 'all' ? t('All') : t(`template.${c}`)}</button>)}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => form.setData('document_template_id', '')} className={cn('rounded-lg border p-3 text-start', !form.data.document_template_id ? 'border-navy-900 bg-navy-50 dark:border-gold-500 dark:bg-navy-800' : 'border-navy-100 dark:border-navy-800')}>
                                <p className="flex items-center gap-2 font-medium"><FileText className="size-4" />{t('Blank document')}</p>
                            </button>
                            {templates.filter((tp) => category === 'all' || tp.category === category).map((tp) => (
                                <button key={tp.id} type="button" onClick={() => form.setData((d) => ({ ...d, document_template_id: String(tp.id), title: d.title || tp.title, language: tp.language }))} className={cn('rounded-lg border p-3 text-start', form.data.document_template_id === String(tp.id) ? 'border-navy-900 bg-navy-50 dark:border-gold-500 dark:bg-navy-800' : 'border-navy-100 hover:border-navy-300 dark:border-navy-800')}>
                                    <p className="font-medium">{tp.title}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-navy-500">
                                        {tp.review_status === 'reviewed' ? <Badge tone="green" icon={<ShieldCheck className="size-3" />}>{t('Reviewed')}</Badge> : <Badge tone="amber" icon={<ShieldAlert className="size-3" />}>{t('Not reviewed')}</Badge>}
                                        {tp.own && <Badge>{t('Your template')}</Badge>}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Details')} />
                    <CardBody className="space-y-4">
                        <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required />
                        <Select label={t('Case')} value={form.data.legal_case_id} onChange={(e) => form.setData('legal_case_id', e.target.value)} options={cases} placeholder={t('Not linked')} />
                        <Select label={t('Client')} value={form.data.client_id} onChange={(e) => form.setData('client_id', e.target.value)} options={clients} placeholder={t('From case')} />
                        <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                        {selected && selected.review_status !== 'reviewed' && <Alert tone="warning">{t('This template is a format skeleton that has not been reviewed by a qualified advocate. Check every part before use.')}</Alert>}
                        <Button className="w-full" loading={form.processing} onClick={() => { form.transform((d) => ({ ...d, document_template_id: d.document_template_id || null, legal_case_id: d.legal_case_id || null, client_id: d.client_id || null })); form.post(route('drafts.store')); }}>{t('Create draft')}</Button>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
