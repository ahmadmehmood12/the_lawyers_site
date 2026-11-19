<?php

namespace App\Services\Analytics;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Works out where a visit came from: utm_source first, then the referring site. */
class TrafficSource
{
    /** The referring host when it is another site (null for direct visits and internal links). */
    public static function externalReferrerHost(Request $request): ?string
    {
        $referrer = (string) $request->headers->get('referer', '');
        $host = Str::lower((string) parse_url($referrer, PHP_URL_HOST));
        if ($host === '') {
            return null;
        }

        $own = Str::lower((string) parse_url((string) config('app.url'), PHP_URL_HOST));

        return $host === $request->getHost() || ($own !== '' && $host === $own) ? null : preg_replace('/^www\./', '', $host);
    }

    public static function detect(?string $utmSource, ?string $referrerHost): string
    {
        $utm = Str::lower(trim((string) $utmSource));
        $aliases = ['fb' => 'facebook', 'ig' => 'instagram', 'twitter' => 'x', 'yt' => 'youtube', 'wa' => 'whatsapp', 'google' => 'search'];
        if ($utm !== '') {
            $utm = $aliases[$utm] ?? $utm;
            if (array_key_exists($utm, config('analytics.sources', []))) {
                return $utm;
            }
        }

        if ($referrerHost === null) {
            return $utm !== '' ? 'referral' : 'direct';
        }

        foreach (config('analytics.sources', []) as $source => $hosts) {
            foreach ($hosts as $pattern) {
                if (str_ends_with($pattern, '.') ? str_contains($referrerHost.'.', $pattern) || str_starts_with($referrerHost, $pattern) : ($referrerHost === $pattern || str_ends_with($referrerHost, '.'.$pattern))) {
                    return $source;
                }
            }
        }

        return 'referral';
    }
}
