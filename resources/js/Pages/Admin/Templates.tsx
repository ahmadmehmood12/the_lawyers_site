import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Badge, Button, Card, Checkbox, DataTable, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = { id: number; category: string; title: string; title_ur: string | null; language: string; description: string | null; body: string; review_status: string; is_active: boolean; reviewer: string | null; reviewed_at: string | null };

export default function Templates({ templates, filters, categories }: { templates: Paginated<Row>; filters: Record<string, string>; categories: string[] }) {
    const t = useT();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    return (
        <AppLayout title={t('Templates')} area="admin" wide>
            <PageHeader title={t('Drafting template library')} description={t('Mark a template “reviewed” only after a qualified advocate has checked it.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New template')}</Button>} />
            <Card>
                <DataTable rows={templates} filters={filters} rowHref={undefined}
                    columns={[
                        { key: 'title', label: t('Template'), render: (r) => <button type="button" className="text-start font-medium hover:underline" onClick={() => setEditing(r)}>{r.title}</button> },
                        { key: 'category', label: t('Category'), render: (r) => t(`template.${r.category}`) },
                        { key: 'review', label: t('Review'), render: (r) => r.review_status === 'reviewed' ? <Badge tone="green">{t('Reviewed')}, {r.reviewer}</Badge> : <Badge tone="amber">{t('Not reviewed')}</Badge> },
                        { key: 'active', label: t('Active'), render: (r) => (r.is_active ? '✓' : '—') },
                    ]} />
            </Card>
            {editing !== undefined && <TemplateDialog key={editing?.id ?? 'new'} template={editing} categories={categories} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function TemplateDialog({ template, categories, onClose }: { template: Row | null; categories: string[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({ category: template?.category ?? 'other', title: template?.title ?? '', title_ur: template?.title_ur ?? '', language: template?.language ?? 'en', description: template?.description ?? '', body: template?.body ?? '<p></p>', is_active: template?.is_active ?? true, review_status: template?.review_status ?? 'unreviewed' });
    const save = () => (template ? form.put(route('admin.templates.update', template.id), { onSuccess: onClose }) : form.post(route('admin.templates.store'), { onSuccess: onClose }));
    return (
        <Modal open onClose={onClose} size="xl" title={template ? t('Edit template') : t('New template')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={save}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                    <Input label={t('Title (Urdu)')} dir="rtl" value={form.data.title_ur} onChange={(e) => form.setData('title_ur', e.target.value)} />
                    <Select label={t('Category')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={categories.map((c) => ({ value: c, label: t(`template.${c}`) }))} />
                </div>
                <Textarea label={t('Description')} rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                <RichTextEditor compact value={form.data.body} onChange={(v) => form.setData('body', v)} dir={form.data.language === 'ur' ? 'rtl' : 'ltr'} />
                <div className="flex flex-wrap gap-5">
                    <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                    <Checkbox label={t('Active')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                    <Checkbox label={t('Reviewed by a qualified advocate')} checked={form.data.review_status === 'reviewed'} onChange={(e) => form.setData('review_status', e.target.checked ? 'reviewed' : 'unreviewed')} />
                </div>
            </div>
        </Modal>
    );
}
