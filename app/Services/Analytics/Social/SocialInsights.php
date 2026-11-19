<?php

namespace App\Services\Analytics\Social;

use App\Models\Setting;
use App\Services\Analytics\AnalyticsRange;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Status of each social network for the dashboard: the profile link from Admin, Settings, and
 * the network's API insights when a driver is configured. Visits from each network are
 * measured on our side (PageVisit.source) and do not depend on these APIs.
 */
class SocialInsights
{
    /**
     * @return list<array{network: string, profile_url: string|null, connected: bool, available: bool, insights: array<string, int|null>|null}>
     */
    public function forRange(AnalyticsRange $range): array
    {
        $rows = [];
        foreach (config('analytics.social', []) as $network => $options) {
            $provider = $this->provider($options['driver'] ?? null);
            $insights = null;
            if ($provider !== null) {
                try {
                    $insights = $provider->insights($range);
                } catch (Throwable $exception) {
                    Log::warning("Social insights for {$network} failed: ".$exception->getMessage());
                }
            }

            $rows[] = [
                'network' => $network,
                'profile_url' => Setting::get("social_{$network}") ?: null,
                'connected' => $provider !== null,
                'available' => $insights !== null,
                'insights' => $insights,
            ];
        }

        return $rows;
    }

    private function provider(?string $driver): ?SocialInsightsProvider
    {
        if (blank($driver) || ! class_exists($driver)) {
            return null;
        }
        $instance = app($driver);

        return $instance instanceof SocialInsightsProvider ? $instance : null;
    }
}
