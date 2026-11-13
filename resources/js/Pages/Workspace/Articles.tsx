import { Link, useForm } from '@inertiajs/react';
import { Eye, Heart, Pencil, Plus, Star } from 'lucide-react';
import { Button, Card, CardHeader, LinkButton, PageHeader, StatusBadge, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Article = { id: number; title: string; slug: string; excerpt: string | null; category: string | null; views: number; likes: number; status: string; status_label: string; rejection_reason: string | null; tags: string[]; published_at: string | null; updated_at: string };
type Review = { id: number; rating: number; title: string | null; comment: string | null; response: string | null; author: string; created_at: string };

export default function Articles({ articles, reviews }: { articles: Article[]; reviews: Review[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Articles & reviews')} wide>
            <PageHeader title={t('Articles & reviews')} description={t('Publish legal articles (after moderation) and respond to client reviews.')} actions={<LinkButton href={route('lawyer.articles.create')} icon={<Plus className="size-4" />}>{t('New article')}</LinkButton>} />
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('My articles')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {articles.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                        {articles.map((a) => (
                            <li key={a.id}>
                                <Link href={route('lawyer.articles.edit', a.id)} className="group flex items-start justify-between gap-3 px-5 py-3 text-sm hover:bg-navy-50 dark:hover:bg-navy-800">
                                    <div className="min-w-0">
                                        <p className="font-medium group-hover:underline">{a.title}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                                            {a.category && <span>{a.category}</span>}
                                            <span>{t('Edited')} {formatDate(a.updated_at, locale)}</span>
                                            <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{a.views}</span>
                                            <span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{a.likes}</span>
                                        </p>
                                        {a.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{a.tags.map((tag) => <span key={tag} className="rounded-full bg-navy-100 px-2 py-0.5 text-[11px] dark:bg-navy-800">#{tag}</span>)}</p>}
                                    </div>
                                    <span className="flex shrink-0 items-center gap-2"><StatusBadge value={a.status} label={a.status_label} /><Pencil className="size-4 text-navy-400" /></span>
                                </Link>
                                {a.rejection_reason && <p className="px-5 pb-2 text-xs text-red-600">{a.rejection_reason}</p>}
                            </li>
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
