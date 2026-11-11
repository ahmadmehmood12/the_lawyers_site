import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { RichTextEditor } from '@/Components/domain/RichTextEditor';
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, StatusBadge, TagInput, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Article = { id: number; title: string; slug: string; excerpt: string | null; body: string; language: string; article_category_id: number | null; rejection_reason: string | null; status: string; status_label: string; tags: string[] };

/** Full page editor for a lawyer's article (Workspace\ArticleController::create / edit). */
export default function ArticleForm({ article, categories }: { article: Article | null; categories: SelectOption[] }) {
    const t = useT();
    const form = useForm({
        title: article?.title ?? '',
        excerpt: article?.excerpt ?? '',
        body: article?.body ?? '<p></p>',
        language: article?.language ?? 'en',
        article_category_id: article?.article_category_id ? String(article.article_category_id) : '',
        tags: article?.tags ?? [],
        submit: false,
    });

    function save(submit: boolean) {
        form.transform((d) => ({ ...d, submit, article_category_id: d.article_category_id || null }));
        if (article) form.put(route('lawyer.articles.update', article.id), { preserveScroll: true });
        else form.post(route('lawyer.articles.store'), { preserveScroll: true });
    }

    const actions = (
        <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Save className="size-4" />} loading={form.processing} onClick={() => save(false)}>{t('Save draft')}</Button>
            <Button icon={<Send className="size-4" />} loading={form.processing} onClick={() => save(true)}>{t('Submit for review')}</Button>
        </div>
    );

    return (
        <AppLayout title={article ? t('Edit article') : t('New article')} wide>
            <Link href={route('lawyer.articles.index')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-navy-600 hover:underline dark:text-navy-300"><ArrowLeft className="size-4" />{t('Articles & reviews')}</Link>
            <PageHeader
                title={article ? t('Edit article') : t('New article')}
                description={article ? <StatusBadge value={article.status} label={article.status_label} /> : t('Write a legal article. It is published after our team reviews it.')}
                actions={actions}
            />
            {article?.rejection_reason && <Alert tone="danger" title={t('Changes requested')} className="mb-4">{article.rejection_reason}</Alert>}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card>
                    <CardBody className="space-y-4">
                        <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required dir={form.data.language === 'ur' ? 'rtl' : undefined} />
                        <Textarea label={t('Summary')} rows={2} value={form.data.excerpt} onChange={(e) => form.setData('excerpt', e.target.value)} error={form.errors.excerpt} hint={t('One or two lines shown on the article card.')} dir={form.data.language === 'ur' ? 'rtl' : undefined} />
                        <div>
                            <p className="mb-1.5 text-sm font-medium">{t('Article')}</p>
                            <RichTextEditor value={form.data.body} onChange={(html) => form.setData('body', html)} dir={form.data.language === 'ur' ? 'rtl' : 'ltr'} />
                            {form.errors.body && <p className="mt-1 text-xs text-red-600">{form.errors.body}</p>}
                        </div>
                    </CardBody>
                </Card>
                <div className="space-y-4 lg:sticky lg:top-20">
                    <Card>
                        <CardHeader title={t('Details')} />
                        <CardBody className="space-y-4">
                            <Select label={t('Category')} value={form.data.article_category_id} onChange={(e) => form.setData('article_category_id', e.target.value)} options={categories} placeholder={t('None')} error={form.errors.article_category_id} />
                            <Select label={t('Language')} value={form.data.language} onChange={(e) => form.setData('language', e.target.value)} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
                            <TagInput label={t('Tags')} value={form.data.tags} onChange={(tags) => form.setData('tags', tags)} placeholder={t('Type a tag and press Enter')} hint={t('Up to 8 tags.')} error={form.errors.tags} />
                        </CardBody>
                    </Card>
                    <Alert tone="info">{t('Articles are general legal information, not advice. Cite only provisions you have verified.')}</Alert>
                    <div className="lg:hidden">{actions}</div>
                </div>
            </div>
        </AppLayout>
    );
}
