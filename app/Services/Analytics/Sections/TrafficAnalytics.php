<?php

namespace App\Services\Analytics\Sections;

use App\Models\PageVisit;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use App\Services\Analytics\Social\SocialInsights;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Website traffic from page_visits (recorded by RecordPageVisit since the tracker went live).
 * A session is one visit; its source is where it entered from. Social numbers here are visits
 * from each network's links; account insights (followers, reach) come from SocialInsights.
 */
class TrafficAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        $since = PageVisit::query()->min('visited_on');

        return [
            'recording' => (bool) config('analytics.track_visits'),
            'recording_since' => $since ? (string) $since : null,
            'kpis' => $this->kpis(),
            'trend' => $this->trend(),
            'sources' => $this->sources(),
            'social' => $this->social(),
            'devices' => $this->grouped($this->visits(), 'device'),
            'pages' => $this->topPages(),
            'subjects' => [
                'articles' => $this->topSubjects('article', 'articles', 'title', 'slug', 'articles.show'),
                'judgments' => $this->topSubjects('judgment', 'reported_judgments', 'title', 'slug', 'judgments.show'),
                'lawyers' => $this->topLawyers(),
            ],
            'referrers' => $this->asIs($this->grouped($this->visits()->where('is_entry', true)->whereNotNull('referrer_host'), 'referrer_host', aggregate: 'COUNT(DISTINCT session_hash)')),
            'campaigns' => $this->asIs(array_slice($this->grouped($this->visits()->whereNotNull('utm_campaign'), 'utm_campaign', aggregate: 'COUNT(DISTINCT session_hash)'), 0, 10)),
        ];
    }

    private function visits(?AnalyticsRange $range = null): Builder
    {
        return ($range ?? $this->range)->applyDate(DB::table('page_visits'), 'visited_on');
    }

    /** @return array<string, array{value: float|int, previous: float|int, change: float|null}> */
    private function kpis(): array
    {
        $totals = fn (AnalyticsRange $range) => $this->visits($range)
            ->selectRaw('COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors, COUNT(DISTINCT session_hash) as sessions')
            ->first();
        $current = $totals($this->range);
        $previous = $totals($this->range->previous());

        $bounce = function (AnalyticsRange $range): float {
            $sessions = DB::query()->fromSub($this->visits($range)->selectRaw('session_hash, COUNT(*) as views')->groupBy('session_hash'), 's')
                ->selectRaw('COUNT(*) as sessions, SUM(views = 1) as single')->first();

            return $sessions && $sessions->sessions ? round(((int) $sessions->single / (int) $sessions->sessions) * 100, 1) : 0.0;
        };
        $social = fn (AnalyticsRange $range) => (int) $this->visits($range)->whereIn('source', PageVisit::SOCIAL)->distinct()->count('session_hash');
        $returning = function (AnalyticsRange $range): int {
            $before = DB::table('page_visits')->where('visited_on', '<', $range->from->toDateString())->select('visitor_hash');

            return (int) $this->visits($range)->whereIn('visitor_hash', $before)->distinct()->count('visitor_hash');
        };

        $pair = fn (float|int $now, float|int $then) => ['value' => $now, 'previous' => $then, 'change' => $this->change($now, $then)];
        $perSession = fn ($row) => $row && $row->sessions ? round($row->views / $row->sessions, 2) : 0;

        return [
            'views' => $pair((int) $current->views, (int) $previous->views),
            'visitors' => $pair((int) $current->visitors, (int) $previous->visitors),
            'sessions' => $pair((int) $current->sessions, (int) $previous->sessions),
            'pages_per_session' => $pair($perSession($current), $perSession($previous)),
            'bounce_rate' => $pair($bounce($this->range), $bounce($this->range->previous())),
            'social_visits' => $this->compare($social),
            'returning_visitors' => $this->compare($returning),
        ];
    }

    private function trend(): array
    {
        $query = DB::table('page_visits');

        return $this->combine([
            'views' => $this->series($query, 'visited_at'),
            'visitors' => $this->series($query, 'visited_at', 'COUNT(DISTINCT visitor_hash)'),
            'previous' => $this->series($query, 'visited_at', range: $this->range->previous()),
        ], ['views' => __('Page views'), 'visitors' => __('Unique visitors'), 'previous' => __('Page views, previous period')]);
    }

    /** Sessions by entry source, this period and the one before, with growth. */
    private function sources(): array
    {
        $sessions = fn (AnalyticsRange $range) => $this->visits($range)->selectRaw('source, COUNT(DISTINCT session_hash) as sessions, COUNT(*) as views')
            ->groupBy('source')->get()->keyBy('source');
        $current = $sessions($this->range);
        $previous = $sessions($this->range->previous());

        return array_map(fn (string $source) => [
            'key' => $source,
            'label' => $this->sourceLabel($source),
            'value' => (int) ($current[$source]->sessions ?? 0),
            'views' => (int) ($current[$source]->views ?? 0),
            'previous' => (int) ($previous[$source]->sessions ?? 0),
            'change' => $this->change((int) ($current[$source]->sessions ?? 0), (int) ($previous[$source]->sessions ?? 0)),
        ], PageVisit::SOURCES);
    }

    private function social(): array
    {
        $rows = collect($this->sources())->keyBy('key');
        $trend = [];
        foreach (PageVisit::SOCIAL as $network) {
            $trend[$network] = $this->series(DB::table('page_visits')->where('source', $network), 'visited_at', 'COUNT(DISTINCT session_hash)');
        }

        return [
            'networks' => array_map(fn (array $insight) => $insight + [
                'label' => $this->sourceLabel($insight['network']),
                'visits' => $rows[$insight['network']]['value'] ?? 0,
                'views' => $rows[$insight['network']]['views'] ?? 0,
                'previous' => $rows[$insight['network']]['previous'] ?? 0,
                'change' => $rows[$insight['network']]['change'] ?? null,
            ], app(SocialInsights::class)->forRange($this->range)),
            'trend' => $this->combine($trend, array_combine(PageVisit::SOCIAL, array_map(fn ($n) => $this->sourceLabel($n), PageVisit::SOCIAL))),
        ];
    }

    private function topPages(): array
    {
        return $this->visits()->selectRaw('path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors, SUM(is_entry) as entries')
            ->groupBy('path')->orderByDesc('views')->limit(25)->get()
            ->map(fn ($row) => ['path' => $row->path, 'views' => (int) $row->views, 'visitors' => (int) $row->visitors, 'entries' => (int) $row->entries])->all();
    }

    private function topSubjects(string $type, string $table, string $titleColumn, string $slugColumn, string $route): array
    {
        return $this->visits()->where('subject_type', $type)
            ->join($table, "{$table}.id", '=', 'page_visits.subject_id')
            ->selectRaw("{$table}.id, {$table}.{$titleColumn} as title, {$table}.{$slugColumn} as slug, COUNT(*) as views, COUNT(DISTINCT page_visits.visitor_hash) as visitors")
            ->groupBy("{$table}.id", "{$table}.{$titleColumn}", "{$table}.{$slugColumn}")
            ->orderByDesc('views')->limit(10)->get()
            ->map(fn ($row) => ['id' => $row->id, 'title' => $row->title, 'views' => (int) $row->views, 'visitors' => (int) $row->visitors, 'url' => route($route, $row->slug)])->all();
    }

    private function topLawyers(): array
    {
        return $this->visits()->where('subject_type', 'lawyer')
            ->join('lawyer_profiles', 'lawyer_profiles.id', '=', 'page_visits.subject_id')
            ->join('users', 'users.id', '=', 'lawyer_profiles.user_id')
            ->selectRaw('lawyer_profiles.id, users.name as title, lawyer_profiles.slug, COUNT(*) as views, COUNT(DISTINCT page_visits.visitor_hash) as visitors')
            ->groupBy('lawyer_profiles.id', 'users.name', 'lawyer_profiles.slug')
            ->orderByDesc('views')->limit(10)->get()
            ->map(fn ($row) => ['id' => $row->id, 'title' => $row->title, 'views' => (int) $row->views, 'visitors' => (int) $row->visitors, 'url' => route('lawyers.show', $row->slug)])->all();
    }

    /** Hosts and campaign names are shown exactly as recorded. */
    private function asIs(array $items): array
    {
        return array_map(fn (array $item) => ['label' => $item['key']] + $item, $items);
    }

    private function sourceLabel(string $source): string
    {
        return match ($source) {
            'direct' => __('Direct'),
            'search' => __('Search engines'),
            'facebook' => 'Facebook',
            'instagram' => 'Instagram',
            'linkedin' => 'LinkedIn',
            'youtube' => 'YouTube',
            'x' => 'X',
            'whatsapp' => 'WhatsApp',
            default => __('Other websites'),
        };
    }
}
