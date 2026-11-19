<?php

/*
| Admin analytics (docs/Modules/Analytics.md).
| Page views are recorded by App\Http\Middleware\RecordPageVisit on public pages only.
*/

return [

    /* Record public page views. Off = the Traffic tab shows "not recording". */
    'track_visits' => env('ANALYTICS_TRACK_VISITS', true),

    /* Page view rows older than this are deleted by `php artisan model:prune` (daily). */
    'retention_days' => (int) env('ANALYTICS_RETENTION_DAYS', 800),

    /* Dashboard numbers are cached for this many seconds per date range (Today: 60 s). */
    'cache_seconds' => (int) env('ANALYTICS_CACHE_SECONDS', 600),

    /*
    | Referrer hosts → traffic source. Matched against the end of the host, so
    | "m.facebook.com" matches "facebook.com". utm_source wins over the referrer.
    */
    'sources' => [
        'facebook' => ['facebook.com', 'fb.com', 'fb.me', 'messenger.com'],
        'instagram' => ['instagram.com'],
        'linkedin' => ['linkedin.com', 'lnkd.in'],
        'youtube' => ['youtube.com', 'youtu.be'],
        'x' => ['x.com', 'twitter.com', 't.co'],
        'whatsapp' => ['whatsapp.com', 'wa.me'],
        'search' => ['google.', 'bing.com', 'duckduckgo.com', 'yahoo.', 'yandex.', 'baidu.com', 'ecosia.org'],
    ],

    /*
    | Social network insights (followers, reach, post engagement) need each network's API.
    | None is connected yet: set a driver class implementing
    | App\Services\Analytics\Social\SocialInsightsProvider to switch one on.
    */
    'social' => [
        'facebook' => ['driver' => env('ANALYTICS_FACEBOOK_DRIVER')],
        'instagram' => ['driver' => env('ANALYTICS_INSTAGRAM_DRIVER')],
        'linkedin' => ['driver' => env('ANALYTICS_LINKEDIN_DRIVER')],
        'youtube' => ['driver' => env('ANALYTICS_YOUTUBE_DRIVER')],
        'x' => ['driver' => env('ANALYTICS_X_DRIVER')],
    ],

    /* User agents that are never counted (lowercase fragments). */
    'bots' => ['bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit', 'preview', 'headless', 'lighthouse', 'pingdom', 'curl', 'wget', 'python-requests', 'httpclient', 'monitor'],
];
