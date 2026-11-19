import { Star } from 'lucide-react';
import { Card, CardHeader, DonutChart, KpiCard, RankedBars, SortableTable, Stat, TrendChart, vizColor } from '@/Components/ui';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { Change, ChartCard, KpiGrid, SectionTitle, single, useFormat, type Item, type Kpi, type PanelProps, type Point } from './shared';

type ArticleRow = { id: number; title: string; url: string; category: string | null; author: string | null; language: string; published_at: string | null; views: number; previous: number; change: number | null; lifetime_views: number; likes: number; likes_in_range: number; comments: number };
type Category = Item & { articles: number; lifetime_views: number; likes: number };
type JudgmentRow = { id: number; title: string; court: string; citation: string | null; views: number; url: string };

export type ContentData = {
    kpis: { published: number; published_new: Kpi; pending: number; views: Kpi; lifetime_views: number; likes: Kpi; comments: Kpi; reviews: Kpi; rating: number; reviews_pending: number; judgments: number; judgments_new: Kpi; judgment_views: Kpi };
    articles: ArticleRow[]; categories: Category[]; article_statuses: Item[]; comment_statuses: Item[]; ratings: Item[]; review_statuses: Item[]; review_trend: Point[];
    judgment_courts: Item[]; judgments_top: JudgmentRow[]; showcase: { testimonials: number; faqs: number; pages: number };
};

export function ContentPanel({ data, select }: PanelProps<ContentData>) {
    const t = useT();
    const f = useFormat();
    const { locale } = useLocale();
    const k = data.kpis;
    const trending = [...data.articles].filter((a) => a.views > 0 && a.views > a.previous).sort((a, b) => (b.views - b.previous) - (a.views - a.previous)).slice(0, 8);

    return (
        <>
            <KpiGrid columns={4}>
                <Stat label={t('Published articles')} value={f.number(k.published)} href={route('admin.articles.index')} />
                <KpiCard label={t('Published in period')} value={f.number(k.published_new.value)} change={k.published_new.change} previous={f.number(k.published_new.previous)} />
                <Stat label={t('Waiting for moderation')} value={f.number(k.pending)} tone={k.pending ? 'gold' : 'navy'} href={route('admin.articles.index')} />
                <KpiCard label={t('Article views')} value={f.number(k.views.value)} change={k.views.change} previous={f.number(k.views.previous)} hint={t(':count lifetime', { count: f.number(k.lifetime_views) })} />
                <KpiCard label={t('Likes')} value={f.number(k.likes.value)} change={k.likes.change} previous={f.number(k.likes.previous)} />
                <KpiCard label={t('Comments')} value={f.number(k.comments.value)} change={k.comments.change} previous={f.number(k.comments.previous)} href={route('admin.articles.index', { tab: 'comments' })} />
                <KpiCard label={t('New lawyer reviews')} value={f.number(k.reviews.value)} change={k.reviews.change} previous={f.number(k.reviews.previous)} href={route('admin.reviews.index')} />
                <Stat label={t('Average rating')} value={k.rating ? <span className="inline-flex items-center gap-1">{k.rating}<Star className="size-4 fill-gold-500 text-gold-500" /></span> : '—'} hint={t(':count reviews to moderate', { count: k.reviews_pending })} href={route('admin.reviews.index')} />
            </KpiGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Categories')} description={t('Article views in the selected period by category.')}>
                    <RankedBars data={data.categories.map((c) => ({ ...c, hint: t(':count articles', { count: c.articles }) }))} format={f.number} />
                </ChartCard>
                <ChartCard title={t('Trending articles')} description={t('Biggest rise in views against the previous period.')}>
                    <RankedBars data={trending.map((a) => ({ key: String(a.id), label: a.title, value: a.views - a.previous, href: a.url }))} format={(v) => `+${f.number(v)}`} color={vizColor(2)} />
                </ChartCard>
            </div>

            <Card className="mt-6">
                <CardHeader title={t('Article performance')} description={t('Views and likes in the selected period; lifetime views include visits before tracking started.')} />
                <SortableTable rows={data.articles} rowKey={(r) => r.id} search={(r) => `${r.title} ${r.category ?? ''} ${r.author ?? ''}`} initialSort={{ key: 'views', direction: 'desc' }}
                    columns={[
                        { key: 'title', label: t('Article'), render: (r) => <span className="block max-w-md"><a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-1 font-medium hover:underline">{r.title}</a><span className="text-xs text-navy-500">{[r.category, r.author, formatDate(r.published_at, locale)].filter(Boolean).join(' · ')}</span></span> },
                        { key: 'views', label: t('Views'), align: 'end', render: (r) => f.number(r.views) },
                        { key: 'change', label: t('Change'), align: 'end', hideOnMobile: true, value: (r) => r.change ?? -Infinity, render: (r) => <Change value={r.change} /> },
                        { key: 'lifetime_views', label: t('Lifetime'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.lifetime_views) },
                        { key: 'likes', label: t('Likes'), align: 'end', render: (r) => f.number(r.likes) },
                        { key: 'comments', label: t('Comments'), align: 'end', hideOnMobile: true, render: (r) => f.number(r.comments) },
                    ]} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('Articles by status')}><DonutChart data={data.article_statuses} format={f.number} centerLabel={t('Articles')} /></ChartCard>
                <ChartCard title={t('Comments by status')}><DonutChart data={data.comment_statuses} format={f.number} centerLabel={t('Comments')} /></ChartCard>
                <ChartCard title={t('Review ratings')} description={t('Approved reviews.')}><RankedBars data={data.ratings} format={f.number} limit={5} color={vizColor(3)} ranked={false} /></ChartCard>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <ChartCard className="xl:col-span-2" title={t('Lawyer reviews over time')}><TrendChart {...single(data.review_trend, t('Reviews'))} onSelect={select} format={f.number} /></ChartCard>
                <ChartCard title={t('Reviews by status')}><DonutChart data={data.review_statuses.map((s) => ({ ...s, href: route('admin.reviews.index') }))} format={f.number} centerLabel={t('Reviews')} /></ChartCard>
            </div>

            <SectionTitle>{t('Reported judgments')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label={t('Published judgments')} value={f.number(k.judgments)} href={route('admin.judgments.index')} />
                <KpiCard label={t('Added in period')} value={f.number(k.judgments_new.value)} change={k.judgments_new.change} previous={f.number(k.judgments_new.previous)} />
                <KpiCard label={t('Judgment page views')} value={f.number(k.judgment_views.value)} change={k.judgment_views.change} previous={f.number(k.judgment_views.previous)} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <ChartCard title={t('By court')}><DonutChart data={data.judgment_courts} format={f.number} centerLabel={t('Judgments')} /></ChartCard>
                <ChartCard className="lg:col-span-2" title={t('Most viewed judgments (lifetime)')}>
                    <RankedBars data={data.judgments_top.map((j) => ({ key: String(j.id), label: j.title, value: j.views, href: j.url, hint: j.citation ?? j.court }))} format={f.number} color={vizColor(6)} />
                </ChartCard>
            </div>

            <SectionTitle>{t('Website content')}</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
                <Stat label={t('Active testimonials')} value={f.number(data.showcase.testimonials)} href={route('admin.testimonials.index')} />
                <Stat label={t('FAQs')} value={f.number(data.showcase.faqs)} href={route('admin.faqs.index')} />
                <Stat label={t('Website pages')} value={f.number(data.showcase.pages)} href={route('admin.pages.index')} />
            </div>
        </>
    );
}
