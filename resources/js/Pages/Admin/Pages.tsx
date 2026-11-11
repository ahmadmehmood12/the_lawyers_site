import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Button, Card, Checkbox, ConfirmAction, Input, Modal, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type PageRow = { id: number; slug: string; title: string; title_ur: string | null; body: string; body_ur: string | null; meta_description: string | null; is_published: boolean; updated_at: string };

export default function Pages({ pages }: { pages: PageRow[] }) {
    const t = useT();
    const [editing, setEditing] = useState<PageRow | null | undefined>(undefined);

    return (
        <AppLayout title={t('Website pages')} area="admin">
            <PageHeader title={t('Website pages')} description={t('About, policy and other public pages. New pages are published at /slug.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New page')}</Button>} />
            <Card>
                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                    {pages.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 pe-3 hover:bg-navy-50 dark:hover:bg-navy-800">
                            <button type="button" onClick={() => setEditing(p)} className="flex min-w-0 flex-1 items-center justify-between px-5 py-3 text-start text-sm">
                                <span className="min-w-0"><span className="font-medium">{p.title}</span> <span className="text-navy-500">/{p.slug}</span></span>
                                <span className="text-xs text-navy-500">{p.updated_at}{!p.is_published && `, ${t('Hidden')}`}</span>
                            </button>
                            <ConfirmAction
                                trigger={(open) => <Button variant="ghost" size="sm" aria-label={t('Delete :page', { page: p.title })} onClick={open}><Trash2 className="size-4" /></Button>}
                                title={t('Delete page?')}
                                description={t('Delete “:title”? This cannot be undone.', { title: p.title })}
                                href={route('admin.pages.destroy', p.id)}
                                method="delete"
                                confirmLabel={t('Delete')}
                            />
                        </li>
                    ))}
                </ul>
            </Card>
            {editing !== undefined && <PageDialog key={editing?.id ?? 'new'} page={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function PageDialog({ page, onClose }: { page: PageRow | null; onClose: () => void }) {
    const t = useT();
    const [lang, setLang] = useState<'en' | 'ur'>('en');
    const form = useForm({ slug: page?.slug ?? '', title: page?.title ?? '', title_ur: page?.title_ur ?? '', body: page?.body ?? '<p></p>', body_ur: page?.body_ur ?? '', meta_description: page?.meta_description ?? '', is_published: page?.is_published ?? true });

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: onClose };
        page ? form.put(route('admin.pages.update', page.id), options) : form.post(route('admin.pages.store'), options);
    };

    return (
        <Modal open onClose={onClose} size="xl" title={page ? `/${page.slug}` : t('New page')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                {!page && <Input label={t('Slug')} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} error={form.errors.slug} hint={t('Lowercase letters, numbers and hyphens. The page will be published at /:slug.', { slug: form.data.slug || 'slug' })} placeholder="about-the-firm" />}
                <div className="flex gap-2"><Button size="sm" variant={lang === 'en' ? 'primary' : 'ghost'} onClick={() => setLang('en')}>English</Button><Button size="sm" variant={lang === 'ur' ? 'primary' : 'ghost'} onClick={() => setLang('ur')}>اردو</Button></div>
                {lang === 'en' ? <><Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} /><RichTextEditor compact value={form.data.body} onChange={(v) => form.setData('body', v)} /></> : <><Input dir="rtl" label={t('Title (Urdu)')} value={form.data.title_ur} onChange={(e) => form.setData('title_ur', e.target.value)} /><RichTextEditor compact dir="rtl" value={form.data.body_ur} onChange={(v) => form.setData('body_ur', v)} /></>}
                <Input label={t('Meta description')} value={form.data.meta_description} onChange={(e) => form.setData('meta_description', e.target.value)} />
                <Checkbox label={t('Published')} checked={form.data.is_published} onChange={(e) => form.setData('is_published', e.target.checked)} />
            </div>
        </Modal>
    );
}
