<?php

namespace App\Services\Analytics;

use App\Services\Analytics\Sections\AppointmentAnalytics;
use App\Services\Analytics\Sections\ContentAnalytics;
use App\Services\Analytics\Sections\FinanceAnalytics;
use App\Services\Analytics\Sections\ModuleAnalytics;
use App\Services\Analytics\Sections\OverviewAnalytics;
use App\Services\Analytics\Sections\PracticeAnalytics;
use App\Services\Analytics\Sections\TrafficAnalytics;
use Illuminate\Support\Facades\Cache;

/**
 * Admin Analytics dashboard data, one tab at a time, cached per tab, range and locale
 * (config('analytics.cache_seconds'); the Today preset: 60 seconds). "Refresh" rebuilds it.
 */
class PlatformAnalytics
{
    /** @var array<string, class-string<AnalyticsSection>> */
    public const TABS = [
        'overview' => OverviewAnalytics::class,
        'traffic' => TrafficAnalytics::class,
        'practice' => PracticeAnalytics::class,
        'appointments' => AppointmentAnalytics::class,
        'finance' => FinanceAnalytics::class,
        'content' => ContentAnalytics::class,
        'modules' => ModuleAnalytics::class,
    ];

    /** @return array<string, mixed> */
    public function tab(string $tab, AnalyticsRange $range, bool $fresh = false): array
    {
        $class = self::TABS[$tab] ?? self::TABS['overview'];
        $key = 'admin-analytics:'.$tab.':'.$range->cacheKey().':'.app()->getLocale();
        if ($fresh) {
            Cache::forget($key);
        }

        $seconds = $range->preset === 'today' ? min(60, (int) config('analytics.cache_seconds')) : (int) config('analytics.cache_seconds');

        return Cache::remember($key, max(1, $seconds), fn () => (new $class($range))->data() + ['generated_at' => now()->toIso8601String()]);
    }
}
