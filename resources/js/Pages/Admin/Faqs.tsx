import { router, useForm } from '@inertiajs/react';
import { HelpCircle, Home, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Row = { id: number; category: string | null; question: string; question_ur: string | null; answer: string; answer_ur: string | null; show_on_home: boolean; is_active: boolean; sort_order: number };
type Props = { rows: Paginated<Row>; categories: string[]; counts: { total: number; active: number; home: number }; filters: Record<string, string> };

/** Admin, FAQs: questions for the homepage section ("Show on homepage") and the /faqs page. */
export default function Faqs({ rows, categories, counts, filters }: Props) {
    const t = useT();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    const toggle = (row: Row, field: 'is_active' | 'show_on_home') => router.put(route('admin.faqs.toggle', row.id), { field }, { preserveScroll: true, preserveState: true });

    return (
        <AppLayout title={t('FAQs')} area="admin" wide>
            <PageHeader title={t('FAQs')} description={t('Questions shown on the FAQs page. Tick “Show on homepage” for the ones that also appear on the homepage.')}
                actions={<div className="flex gap-2"><a href={route('faqs')} target="_blank" rel="noreferrer"><Button variant="secondary">{t('View page')}</Button></a><Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('Add question')}</Button></div>} />
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {[[t('Questions'), counts.total, <HelpCircle key="q" className="size-4" />], [t('Active'), counts.active, <Badge key="a" tone="green">{t('Live')}</Badge>], [t('On homepage'), counts.home, <Home key="h" className="size-4" />]].map(([label, value, icon]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-card border border-navy-100 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900">
                        <span className="inline-flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">{icon}{label}</span>
                        <span className="text-xl font-semibold tabular-nums">{value as number}</span>
                    </div>
                ))}
            </div>
            {categories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {['', ...categories].map((c) => (
                        <button key={c || 'all'} type="button" onClick={() => router.get(route('admin.faqs.index'), { ...filters, category: c || undefined }, { preserveState: true })}
                            className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', (filters.category ?? '') === c && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>
                            {c || t('All')}
                        </button>
                    ))}
                </div>
            )}
            <Card>
                <DataTable
                    rows={rows}
                    filters={filters}
                    searchPlaceholder={t('Question or answer')}
                    empty={t('No questions yet. Add the first one.')}
                    columns={[
                        { key: 'question', label: t('Question'), render: (r) => (
                            <div className="max-w-xl">
                                <p className="font-medium">{r.question}</p>
                                <p className="line-clamp-2 text-xs text-navy-500">{r.answer}</p>
                                {r.question_ur && <p className="mt-1 font-urdu text-xs text-navy-500" dir="rtl">{r.question_ur}</p>}
                            </div>
                        ) },
                        { key: 'category', label: t('Category'), hideOnMobile: true, render: (r) => r.category ? <Badge>{r.category}</Badge> : '—' },
                        { key: 'sort_order', label: t('Order'), hideOnMobile: true, render: (r) => <span className="tabular-nums">{r.sort_order}</span> },
                        { key: 'flags', label: t('Status'), render: (r) => (
                            <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => toggle(r, 'is_active')} title={t('Click to switch')}><Badge tone={r.is_active ? 'green' : 'neutral'}>{r.is_active ? t('Active') : t('Hidden')}</Badge></button>
                                <button type="button" onClick={() => toggle(r, 'show_on_home')} title={t('Click to switch')}><Badge tone={r.show_on_home ? 'gold' : 'neutral'}>{r.show_on_home ? t('On homepage') : t('FAQs page only')}</Badge></button>
                            </div>
                        ) },
                        { key: 'actions', label: '', render: (r) => (
                            <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                                <ConfirmAction href={route('admin.faqs.destroy', r.id)} method="delete" title={t('Delete this question?')} confirmLabel={t('Delete')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Delete')} onClick={open}><Trash2 className="size-4" /></Button>} />
                            </div>
                        ) },
                    ]}
                />
            </Card>
            {editing !== undefined && <FaqDialog key={editing?.id ?? 'new'} row={editing} categories={categories} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function FaqDialog({ row, categories, onClose }: { row: Row | null; categories: string[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({
        category: row?.category ?? '', question: row?.question ?? '', question_ur: row?.question_ur ?? '', answer: row?.answer ?? '', answer_ur: row?.answer_ur ?? '',
        show_on_home: row?.show_on_home ?? false, is_active: row?.is_active ?? true, sort_order: String(row?.sort_order ?? 0),
    });

    function submit() {
        form.transform((d) => ({ ...d, category: d.category || null, sort_order: Number(d.sort_order) || 0 }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (row) form.put(route('admin.faqs.update', row.id), options);
        else form.post(route('admin.faqs.store'), options);
    }

    return (
        <Modal open onClose={onClose} title={row ? t('Edit question') : t('Add question')} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input wrapperClassName="sm:col-span-2" label={t('Question (English)')} value={form.data.question} onChange={(e) => form.setData('question', e.target.value)} error={form.errors.question} required />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Answer (English)')} rows={4} value={form.data.answer} onChange={(e) => form.setData('answer', e.target.value)} error={form.errors.answer} required />
                <Input wrapperClassName="sm:col-span-2" dir="rtl" label={t('Question (Urdu)')} value={form.data.question_ur} onChange={(e) => form.setData('question_ur', e.target.value)} error={form.errors.question_ur} hint={t('Optional. English is shown when empty.')} />
                <Textarea wrapperClassName="sm:col-span-2" dir="rtl" label={t('Answer (Urdu)')} rows={3} value={form.data.answer_ur} onChange={(e) => form.setData('answer_ur', e.target.value)} error={form.errors.answer_ur} />
                <div>
                    <Input label={t('Category')} list="faq-categories" placeholder={t('e.g. Advocates, Clients, Billing')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} error={form.errors.category} />
                    <datalist id="faq-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <Input label={t('Display order')} type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} error={form.errors.sort_order} hint={t('Lower numbers show first.')} />
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                    <Checkbox label={t('Active (shown on the FAQs page)')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                    <Checkbox label={t('Show on homepage')} checked={form.data.show_on_home} onChange={(e) => form.setData('show_on_home', e.target.checked)} />
                </div>
            </div>
        </Modal>
    );
}
