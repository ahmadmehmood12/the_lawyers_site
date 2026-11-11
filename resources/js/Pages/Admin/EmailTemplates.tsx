import { router, useForm } from '@inertiajs/react';
import { ExternalLink, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardHeader, Checkbox, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type Version = { subject: string; heading: string | null; intro: string | null; outro: string | null; is_active: boolean } | null;
type Template = { key: string; label: string; group: string; placeholders: string[]; versions: { en: Version; ur: Version } };

/**
 * Admin, Email templates: reword notification emails per language. The branded layout and the
 * details table (dates, court, links) are fixed; only subject, heading, intro and outro change.
 */
export default function EmailTemplates({ templates }: { templates: Template[] }) {
    const t = useT();
    const [editing, setEditing] = useState<{ template: Template; language: 'en' | 'ur' } | null>(null);
    const groups = Array.from(new Set(templates.map((x) => x.group)));

    return (
        <AppLayout title={t('Email templates')} area="admin" wide>
            <PageHeader title={t('Email templates')} description={t('Every notification email uses the branded layout with your logo. Reword the text here; dates, court, people and links are always filled in automatically.')} />
            <Alert tone="info" className="mb-5">{t('Without a custom version, the built-in wording is used in the reader’s language.')}</Alert>
            <div className="grid items-start gap-6 xl:grid-cols-2">
                {groups.map((group) => (
                    <Card key={group}>
                        <CardHeader title={group} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {templates.filter((x) => x.group === group).map((template) => (
                                <li key={template.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">{template.label}</p>
                                        <p className="text-xs text-navy-500">{template.key}</p>
                                    </div>
                                    {(['en', 'ur'] as const).map((language) => {
                                        const version = template.versions[language];
                                        return (
                                            <div key={language} className="flex items-center gap-1.5">
                                                <Badge tone={version ? (version.is_active ? 'green' : 'neutral') : 'neutral'}>{language === 'en' ? 'English' : 'اردو'}: {version ? (version.is_active ? t('Custom') : t('Off')) : t('Built-in')}</Badge>
                                                <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing({ template, language })}><Pencil className="size-4" /></Button>
                                                {version && <Button size="sm" variant="ghost" aria-label={t('Reset to built-in')} onClick={() => router.delete(route('admin.email-templates.reset', [template.key, language]), { preserveScroll: true })}><RotateCcw className="size-4" /></Button>}
                                                <a href={route('admin.email-templates.preview', { key: template.key, language })} target="_blank" rel="noreferrer" className="rounded p-1.5 text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Preview')} title={t('Preview')}><ExternalLink className="size-4" /></a>
                                            </div>
                                        );
                                    })}
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>
            {editing && <TemplateDialog key={editing.template.key + editing.language} template={editing.template} language={editing.language} onClose={() => setEditing(null)} />}
        </AppLayout>
    );
}

function TemplateDialog({ template, language, onClose }: { template: Template; language: 'en' | 'ur'; onClose: () => void }) {
    const t = useT();
    const version = template.versions[language];
    const form = useForm({ language, subject: version?.subject ?? '', heading: version?.heading ?? '', intro: version?.intro ?? '', outro: version?.outro ?? '', is_active: version?.is_active ?? true });
    const dir = form.data.language === 'ur' ? 'rtl' : 'ltr';
    return (
        <Modal open onClose={onClose} title={t('Edit: :label', { label: template.label })} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => form.put(route('admin.email-templates.save', template.key), { preserveScroll: true, onSuccess: onClose })}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value as 'en' | 'ur')} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                <p className="text-xs text-navy-500">{t('Placeholders')}: {template.placeholders.map((p) => <code key={p} className="me-1.5 rounded bg-navy-100 px-1 dark:bg-navy-800">:{p}</code>)}</p>
                <Input label={t('Subject')} dir={dir} value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} error={form.errors.subject} required />
                <Input label={t('Heading')} dir={dir} value={form.data.heading} onChange={(e) => form.setData('heading', e.target.value)} error={form.errors.heading} hint={t('Leave empty to use the subject.')} />
                <Textarea label={t('Opening text')} dir={dir} rows={4} value={form.data.intro} onChange={(e) => form.setData('intro', e.target.value)} error={form.errors.intro} hint={t('One paragraph per line. Shown above the details table.')} />
                <Textarea label={t('Closing text')} dir={dir} rows={3} value={form.data.outro} onChange={(e) => form.setData('outro', e.target.value)} error={form.errors.outro} />
                <Checkbox label={t('Use this version')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            </div>
        </Modal>
    );
}
