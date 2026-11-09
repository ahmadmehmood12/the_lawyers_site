import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Button, Card, Checkbox, Input, Modal, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type PageRow = { id: number; slug: string; title: string; title_ur: string | null; body: string; body_ur: string | null; meta_description: string | null; is_published: boolean; updated_at: string };

export default function Pages({ pages }: { pages: PageRow[] }) {
    const t = useT();
    const [editing, setEditing] = useState<PageRow | null>(null);
    return (
        <AppLayout title={t('Website pages')} area="admin">
            <PageHeader title={t('Website pages')} />
            <Card><ul className="divide-y divide-navy-100 dark:divide-navy-800">{pages.map((p) => <li key={p.id}><button type="button" onClick={() => setEditing(p)} className="flex w-full items-center justify-between px-5 py-3 text-start text-sm hover:bg-navy-50 dark:hover:bg-navy-800"><span><span className="font-medium">{p.title}</span> <span className="text-navy-500">/{p.slug}</span></span><span className="text-xs text-navy-500">{p.updated_at}{!p.is_published && `, ${t('Hidden')}`}</span></button></li>)}</ul></Card>
            {editing && <PageDialog key={editing.id} page={editing} onClose={() => setEditing(null)} />}
        </AppLayout>
    );
}

function PageDialog({ page, onClose }: { page: PageRow; onClose: () => void }) {
    const t = useT();
    const [lang, setLang] = useState<'en' | 'ur'>('en');
    const form = useForm({ title: page.title, title_ur: page.title_ur ?? '', body: page.body, body_ur: page.body_ur ?? '', meta_description: page.meta_description ?? '', is_published: page.is_published });
    return (
        <Modal open onClose={onClose} size="xl" title={`/${page.slug}`} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => form.put(route('admin.pages.update', page.id), { onSuccess: onClose })}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                <div className="flex gap-2"><Button size="sm" variant={lang === 'en' ? 'primary' : 'ghost'} onClick={() => setLang('en')}>English</Button><Button size="sm" variant={lang === 'ur' ? 'primary' : 'ghost'} onClick={() => setLang('ur')}>اردو</Button></div>
                {lang === 'en' ? <><Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} /><RichTextEditor compact value={form.data.body} onChange={(v) => form.setData('body', v)} /></> : <><Input dir="rtl" label={t('Title (Urdu)')} value={form.data.title_ur} onChange={(e) => form.setData('title_ur', e.target.value)} /><RichTextEditor compact dir="rtl" value={form.data.body_ur} onChange={(v) => form.setData('body_ur', v)} /></>}
                <Input label={t('Meta description')} value={form.data.meta_description} onChange={(e) => form.setData('meta_description', e.target.value)} />
                <Checkbox label={t('Published')} checked={form.data.is_published} onChange={(e) => form.setData('is_published', e.target.checked)} />
            </div>
        </Modal>
    );
}
