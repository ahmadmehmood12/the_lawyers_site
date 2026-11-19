<?php

namespace App\Services\Analytics\Social;

use App\Services\Analytics\AnalyticsRange;

/**
 * Account-level numbers from a social network's own API (Meta Graph for Facebook and
 * Instagram, LinkedIn Pages, YouTube Analytics, X API). Register an implementation in
 * config('analytics.social.<network>.driver'). Return null when the API call fails, so the
 * dashboard shows "unavailable" instead of a false zero.
 */
interface SocialInsightsProvider
{
    /**
     * @return array{followers: int|null, impressions: int|null, reach: int|null, engagements: int|null, posts: int|null}|null
     */
    public function insights(AnalyticsRange $range): ?array;
}
