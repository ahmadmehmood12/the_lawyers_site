<?php

namespace App\Services\Analytics\Sections;

use App\Enums\ArticleStatus;
use App\Enums\ReviewStatus;
use App\Models\ReportedJudgment;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Articles (blog), categories, comments, likes, reviews and reported judgments.
 * "Views in range" come from page_visits; "lifetime views" is the counter kept on each
 * article and judgment since it was published (includes views before tracking started).
 */
class ContentAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        return [
            'kpis' => [
                'published' => (int) $this->articles()->where('status', 'published')->count(),
                'published_new' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply($this->articles()->where('status', 'published'), 'published_at')->count()),
                'pending' => (int) $this->articles()->where('status', 'pending')->count(),
                'views' => $this->compare(fn (AnalyticsRange $r) => (int) $this->articleVisits($r)->count()),
                'lifetime_views' => (int) $this->articles()->sum('views'),
                'likes' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('article_likes'), 'created_at')->count()),
                'comments' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('article_comments'), 'created_at')->count()),
                'reviews' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('reviews'), 'created_at')->count()),
                'rating' => round((float) DB::table('reviews')->where('status', 'approved')->avg('rating'), 2),
                'reviews_pending' => (int) DB::table('reviews')->where('status', 'pending')->count(),
                'judgments' => (int) ReportedJudgment::query()->listed()->count(),
                'judgments_new' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(ReportedJudgment::query()->listed(), 'created_at')->count()),
                'judgment_views' => $this->compare(fn (AnalyticsRange $r) => (int) $r->applyDate(DB::table('page_visits')->where('subject_type', 'judgment'), 'visited_on')->count()),
            ],
            'articles' => $this->topArticles(),
            'categories' => $this->categories(),
            'article_statuses' => $this->enumCounts($this->articles(), 'status', ArticleStatus::class),
            'comment_statuses' => $this->enumCounts(DB::table('article_comments'), 'status', ReviewStatus::class),
            'ratings' => $this->ratings(),
            'review_statuses' => $this->enumCounts(DB::table('reviews'), 'status', ReviewStatus::class),
            'review_trend' => $this->series(DB::table('reviews'), 'created_at'),
            'judgment_courts' => array_map(fn (array $row) => $row + ['label' => strtoupper($row['key'])], $this->grouped(ReportedJudgment::query()->listed()->toBase(), 'court')),
            'judgments_top' => ReportedJudgment::query()->listed()->orderByDesc('views')->limit(10)->get(['id', 'title', 'slug', 'court', 'views', 'citation'])
                ->map(fn (ReportedJudgment $j) => ['id' => $j->id, 'title' => $j->title, 'court' => strtoupper((string) $j->court), 'citation' => $j->citation, 'views' => (int) $j->views, 'url' => route('judgments.show', $j->slug)])->all(),
            'showcase' => [
                'testimonials' => (int) DB::table('testimonials')->where('is_active', true)->count(),
                'faqs' => (int) DB::table('faqs')->count(),
                'pages' => (int) DB::table('pages')->count(),
            ],
        ];
    }

    private function articles(): Builder
    {
        return DB::table('articles')->whereNull('articles.deleted_at');
    }

    private function articleVisits(AnalyticsRange $range): Builder
    {
        return $range->applyDate(DB::table('page_visits')->where('subject_type', 'article'), 'visited_on');
    }

    /** Articles ranked by views in the range (then lifetime), with growth against the previous period. */
    private function topArticles(): array
    {
        $current = $this->articleVisits($this->range)->selectRaw('subject_id, COUNT(*) as views')->groupBy('subject_id')->pluck('views', 'subject_id');
        $previous = $this->articleVisits($this->range->previous())->selectRaw('subject_id, COUNT(*) as views')->groupBy('subject_id')->pluck('views', 'subject_id');
        $likes = $this->range->apply(DB::table('article_likes'), 'created_at')->selectRaw('article_id, COUNT(*) as total')->groupBy('article_id')->pluck('total', 'article_id');
        $comments = DB::table('article_comments')->selectRaw('article_id, COUNT(*) as total')->groupBy('article_id')->pluck('total', 'article_id');

        return $this->articles()->where('articles.status', 'published')
            ->leftJoin('article_categories', 'article_categories.id', '=', 'articles.article_category_id')
            ->leftJoin('users', 'users.id', '=', 'articles.author_id')
            ->select('articles.id', 'articles.title', 'articles.slug', 'articles.views', 'articles.likes_count', 'articles.published_at', 'articles.language', 'article_categories.name as category', 'users.name as author')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'title' => $row->title,
                'url' => route('articles.show', $row->slug),
                'category' => $row->category,
                'author' => $row->author,
                'language' => $row->language,
                'published_at' => $row->published_at,
                'views' => (int) ($current[$row->id] ?? 0),
                'previous' => (int) ($previous[$row->id] ?? 0),
                'change' => $this->change((int) ($current[$row->id] ?? 0), (int) ($previous[$row->id] ?? 0)),
                'lifetime_views' => (int) $row->views,
                'likes' => (int) $row->likes_count,
                'likes_in_range' => (int) ($likes[$row->id] ?? 0),
                'comments' => (int) ($comments[$row->id] ?? 0),
            ])
            ->sortByDesc(fn ($a) => [$a['views'], $a['lifetime_views']])->values()->take(50)->all();
    }

    private function categories(): array
    {
        $views = $this->articleVisits($this->range)->join('articles', 'articles.id', '=', 'page_visits.subject_id')
            ->selectRaw('articles.article_category_id, COUNT(*) as views')->groupBy('articles.article_category_id')->pluck('views', 'article_category_id');

        return DB::table('article_categories')
            ->leftJoin('articles', fn ($j) => $j->on('articles.article_category_id', '=', 'article_categories.id')->whereNull('articles.deleted_at')->where('articles.status', 'published'))
            ->selectRaw('article_categories.id, article_categories.name, article_categories.name_ur, COUNT(articles.id) as articles, COALESCE(SUM(articles.views), 0) as lifetime_views, COALESCE(SUM(articles.likes_count), 0) as likes')
            ->groupBy('article_categories.id', 'article_categories.name', 'article_categories.name_ur')->get()
            ->map(fn ($row) => [
                'key' => (string) $row->id,
                'label' => app()->getLocale() === 'ur' && $row->name_ur ? $row->name_ur : $row->name,
                'articles' => (int) $row->articles,
                'value' => (int) ($views[$row->id] ?? 0),
                'lifetime_views' => (int) $row->lifetime_views,
                'likes' => (int) $row->likes,
            ])->sortByDesc(fn ($c) => [$c['value'], $c['lifetime_views']])->values()->all();
    }

    private function ratings(): array
    {
        $counts = DB::table('reviews')->where('status', 'approved')->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');

        return array_map(fn (int $stars) => ['key' => (string) $stars, 'label' => trans_choice(':count star|:count stars', $stars), 'value' => (int) ($counts[$stars] ?? 0)], [5, 4, 3, 2, 1]);
    }
}
