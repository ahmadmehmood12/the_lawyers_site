import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Star, Trash2, Video } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Select, Textarea, UserCell } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = {
    id: number; kind: 'text' | 'video'; name: string; designation: string | null; body: string | null; rating: number | null;
    is_verified_client: boolean; is_featured: boolean; is_active: boolean; sort_order: number;
    photo_url: string | null; video_url: string | null; thumbnail_url: string | null;
};

const fileClasses = 'block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100';

/** Admin, Testimonials: client reviews and video testimonials for the homepage (docs/Modules/Showcase.md). */
export default function Testimonials({ kind, rows, counts, filters }: { kind: 'text' | 'video'; rows: Paginated<Row>; counts: Record<string, number>; filters: Record<string, string> }) {
    const t = useT();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    const toggle = (row: Row, field: 'is_active' | 'is_featured') => router.put(route('admin.testimonials.toggle', row.id), { field }, { preserveScroll: true, preserveState: true });

    return (
        <AppLayout title={t('Testimonials')} area="admin" wide>
            <PageHeader title={t('Testimonials')} description={t('Client reviews and video testimonials shown on the homepage. Only active items are public.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{kind === 'video' ? t('Add video') : t('Add review')}</Button>} />
            <div className="mb-4 flex gap-1.5">
                {(['text', 'video'] as const).map((k) => (
                    <button key={k} type="button" onClick={() => router.get(route('admin.testimonials.index'), { kind: k })} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', kind === k && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>
                        {k === 'text' ? t('Client reviews') : t('Video testimonials')} <span className="tabular-nums opacity-70">({counts[k] ?? 0})</span>
                    </button>
                ))}
            </div>
            <Card>
                <DataTable
                    rows={rows}
                    filters={filters}
                    searchPlaceholder={t('Name or designation')}
                    empty={t('Nothing here yet. Add the first one.')}
                    columns={[
                        { key: 'name', label: t('Client'), render: (r) => <UserCell name={r.name} avatar={r.photo_url ?? r.thumbnail_url} subtitle={r.designation} extra={r.is_verified_client && <Badge tone="green">{t('Verified client')}</Badge>} /> },
                        kind === 'video'
                            ? { key: 'video', label: t('Video'), render: (r) => (r.video_url ? <a href={r.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline"><Video className="size-4" />{t('Watch')}</a> : '—') }
                            : { key: 'body', label: t('Review'), render: (r) => <p className="line-clamp-2 max-w-md text-sm text-navy-600 dark:text-navy-300">{r.body}</p> },
                        { key: 'rating', label: t('Rating'), hideOnMobile: true, render: (r) => (r.rating ? <span className="inline-flex items-center gap-1 tabular-nums"><Star className="size-3.5 fill-gold-400 text-gold-400" />{r.rating}</span> : '—') },
                        { key: 'sort_order', label: t('Order'), hideOnMobile: true, render: (r) => <span className="tabular-nums">{r.sort_order}</span> },
                        { key: 'flags', label: t('Status'), render: (r) => (
                            <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => toggle(r, 'is_active')}><Badge tone={r.is_active ? 'green' : 'neutral'}>{r.is_active ? t('Active') : t('Hidden')}</Badge></button>
                                <button type="button" onClick={() => toggle(r, 'is_featured')}><Badge tone={r.is_featured ? 'gold' : 'neutral'}>{r.is_featured ? t('Featured') : t('Not featured')}</Badge></button>
                            </div>
                        ) },
                        { key: 'actions', label: '', render: (r) => (
                            <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                                <ConfirmAction href={route('admin.testimonials.destroy', r.id)} method="delete" title={t('Delete this testimonial?')} confirmLabel={t('Delete')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Delete')} onClick={open}><Trash2 className="size-4" /></Button>} />
                            </div>
                        ) },
                    ]}
                />
            </Card>
            {editing !== undefined && <TestimonialDialog key={editing?.id ?? 'new'} kind={kind} row={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function TestimonialDialog({ kind, row, onClose }: { kind: 'text' | 'video'; row: Row | null; onClose: () => void }) {
    const t = useT();
    const form = useForm<{ kind: string; name: string; designation: string; body: string; rating: string; is_verified_client: boolean; is_featured: boolean; is_active: boolean; sort_order: string; photo: File | null; thumbnail: File | null; video: File | null }>({
        kind: row?.kind ?? kind, name: row?.name ?? '', designation: row?.designation ?? '', body: row?.body ?? '', rating: row?.rating ? String(row.rating) : '',
        is_verified_client: row?.is_verified_client ?? false, is_featured: row?.is_featured ?? false, is_active: row?.is_active ?? true, sort_order: String(row?.sort_order ?? 0),
        photo: null, thumbnail: null, video: null,
    });
    const isVideo = form.data.kind === 'video';
    function submit() {
        form.transform((d) => ({ ...d, rating: d.rating || null }));
        const options = { forceFormData: true, preserveScroll: true, onSuccess: onClose };
        if (row) form.post(route('admin.testimonials.update', row.id), options);
        else form.post(route('admin.testimonials.store'), options);
    }

    return (
        <Modal open onClose={onClose} title={row ? t('Edit testimonial') : isVideo ? t('Add video testimonial') : t('Add client review')} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Client name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                <Input label={t('Designation')} placeholder={t('e.g. Business owner, Lahore')} value={form.data.designation} onChange={(e) => form.setData('designation', e.target.value)} error={form.errors.designation} />
                <Textarea wrapperClassName="sm:col-span-2" label={isVideo ? t('Description') : t('Review')} rows={4} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} required={!isVideo} hint={t('Use the client’s own words, with their permission.')} />
                <Select label={t('Rating')} value={form.data.rating} onChange={(e) => form.setData('rating', e.target.value)} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: '★'.repeat(n) }))} placeholder={t('No rating')} error={form.errors.rating} />
                <Input label={t('Display order')} type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} error={form.errors.sort_order} hint={t('Lower numbers show first; featured items lead.')} />
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">{t('Client photo')}</p>
                    {row?.photo_url && <img src={row.photo_url} alt="" className="size-14 rounded-full object-cover" />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className={fileClasses} onChange={(e) => form.setData('photo', e.target.files?.[0] ?? null)} aria-label={t('Client photo')} />
                    {form.errors.photo && <p className="text-xs text-red-600">{form.errors.photo}</p>}
                </div>
                {isVideo && (
                    <>
                        <div className="space-y-1.5">
                            <p className="text-sm font-medium">{t('Video')}</p>
                            <input type="file" accept="video/mp4,video/webm" className={fileClasses} onChange={(e) => form.setData('video', e.target.files?.[0] ?? null)} aria-label={t('Video')} />
                            <p className="text-xs text-navy-500">{t('MP4 or WebM, up to 50 MB. Keep it short and well lit.')}</p>
                            {form.errors.video && <p className="text-xs text-red-600">{form.errors.video}</p>}
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <p className="text-sm font-medium">{t('Thumbnail')}</p>
                            {row?.thumbnail_url && <img src={row.thumbnail_url} alt="" className="h-20 rounded object-cover" />}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className={fileClasses} onChange={(e) => form.setData('thumbnail', e.target.files?.[0] ?? null)} aria-label={t('Thumbnail')} />
                            <p className="text-xs text-navy-500">{t('Shown before the video plays. Landscape, at least 1280 px wide works best.')}</p>
                        </div>
                    </>
                )}
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                    <Checkbox label={t('Verified client')} checked={form.data.is_verified_client} onChange={(e) => form.setData('is_verified_client', e.target.checked)} />
                    <Checkbox label={t('Featured')} checked={form.data.is_featured} onChange={(e) => form.setData('is_featured', e.target.checked)} />
                    <Checkbox label={t('Active (shown on the homepage)')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                </div>
            </div>
        </Modal>
    );
}
