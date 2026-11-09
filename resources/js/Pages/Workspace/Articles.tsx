import { useForm } from '@inertiajs/react';
import { Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Alert, Button, Card, CardBody, CardHeader, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Article = { id: number; title: string; slug: string; excerpt: string | null; body: string; language: string; status: string; status_label: string; rejection_reason: string | null; article_category_id: number | null; tags: string; published_at: string | null };
type Review = { id: number; rating: number; title: string | null; comment: string | null; response: string | null; author: string; created_at: string };

export default function Articles({ articles, categories, reviews }: { articles: Article[]; categories: SelectOption[]; reviews: Review[] }) {
    const t = useT();
    const [editing, setEditing] = useState<Article | null | undefined>(undefined);
    return (
        <AppLayout title={t('Articles & reviews')}>
            <PageHeader title={t('Articles & reviews')} description={t('Publish legal articles (after moderation) and respond to client reviews.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('New article')}</Button>} />
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('My articles')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {articles.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                        {articles.map((a) => (
                            <li key={a.id}><button type="button" onClick={() => setEditing(a)} className="flex w-full items-center justify-between gap-2 px-5 py-3 text-start text-sm hover:bg-navy-50 dark:hover:bg-navy-800"><span className="font-medium">{a.title}</span><StatusBadge value={a.status} label={a.status_label} /></button>{a.rejection_reason && <p className="px-5 pb-2 text-xs text-red-600">{a.rejection_reason}</p>}</li>
                        ))}
                    </ul>
                </Card>
                <Card>
                    <CardHeader title={t('Reviews')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {reviews.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">{t('No published reviews yet.')}</li>}
                        {reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
                    </ul>
                </Card>
            </div>
            <ArticleDialog article={editing} onClose={() => setEditing(undefined)} categories={categories} />
        </AppLayout>
    );
}

function ReviewItem({ review }: { review: Review }) {
    const t = useT();
    const form = useForm({ response: review.response ?? '' });
    return (
        <li className="space-y-2 px-5 py-3 text-sm">
            <p className="flex items-center gap-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-3.5 ${i < review.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200'}`} />)}<span className="ms-2 font-medium">{review.title}</span></p>
            <p>{review.comment}</p>
            <p className="text-xs text-navy-500">{review.author}, {review.created_at}</p>
            <Textarea aria-label={t('Response')} rows={2} placeholder={t('Write a public response…')} value={form.data.response} onChange={(e) => form.setData('response', e.target.value)} />
            <Button size="sm" variant="secondary" loading={form.processing} disabled={!form.data.response} onClick={() => form.post(route('lawyer.reviews.respond', review.id), { preserveScroll: true })}>{t('Publish response')}</Button>
        </li>
    );
}

function ArticleDialog({ article, onClose, categories }: { article: Article | null | undefined; onClose: () => void; categories: SelectOption[] }) {
    const t = useT();
    const form = useForm({ title: article?.title ?? '', excerpt: article?.excerpt ?? '', body: article?.body ?? '<p></p>', language: article?.language ?? 'en', article_category_id: String(article?.article_category_id ?? ''), tags: article?.tags ?? '', submit: false });
    const key = article?.id ?? 'new';
    function save(submit: boolean) {
        form.transform((d) => ({ ...d, submit, article_category_id: d.article_category_id || null }));
        const opts = { preserveScroll: true, onSuccess: onClose };
        article ? form.put(route('lawyer.articles.update', article.id), opts) : form.post(route('lawyer.articles.store'), opts);
    }
    return (
        <Modal key={key} open={article !== undefined} onClose={onClose} size="xl" title={article ? t('Edit article') : t('New article')} footer={<><Button variant="secondary" onClick={() => save(false)} loading={form.processing}>{t('Save draft')}</Button><Button onClick={() => save(true)} loading={form.processing}>{t('Submit for review')}</Button></>}>
            <div className="space-y-4">
                <Alert tone="info">{t('Articles are general legal information, not advice. Cite only provisions you have verified.')}</Alert>
                <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                <div className="grid gap-4 sm:grid-cols-3">
                    <Select label={t('Category')} value={form.data.article_category_id} onChange={(e) => form.setData('article_category_id', e.target.value)} options={categories} placeholder={t('None')} />
                    <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                    <Input label={t('Tags (comma separated)')} value={form.data.tags} onChange={(e) => form.setData('tags', e.target.value)} />
                </div>
                <Textarea label={t('Summary')} rows={2} value={form.data.excerpt} onChange={(e) => form.setData('excerpt', e.target.value)} />
                <RichTextEditor compact value={form.data.body} onChange={(html) => form.setData('body', html)} dir={form.data.language === 'ur' ? 'rtl' : 'ltr'} />
            </div>
        </Modal>
    );
}
