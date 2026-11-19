<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\PlatformAnalytics;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin Analytics dashboard (Super Admin and Admin: permission analytics.platform).
 * One tab is computed per request and loaded as a deferred prop, so the page shell and
 * filters appear at once. Aggregates only; no case content.
 */
class AnalyticsController extends Controller
{
    public function __invoke(Request $request, PlatformAnalytics $analytics): Response
    {
        $filters = $request->validate([
            'tab' => ['nullable', Rule::in(array_keys(PlatformAnalytics::TABS))],
            'range' => ['nullable', Rule::in(AnalyticsRange::PRESETS)],
            'from' => ['nullable', 'date_format:Y-m-d', 'required_if:range,custom'],
            'to' => ['nullable', 'date_format:Y-m-d', 'required_if:range,custom'],
            'interval' => ['nullable', Rule::in(AnalyticsRange::INTERVALS)],
            'fresh' => ['nullable', 'boolean'],
        ]);

        $tab = $filters['tab'] ?? 'overview';
        $range = AnalyticsRange::make($filters['range'] ?? '30d', $filters['from'] ?? null, $filters['to'] ?? null, $filters['interval'] ?? 'auto');

        return Inertia::render('Admin/Analytics', [
            'tab' => $tab,
            'filters' => ['range' => $range->preset, 'interval' => $filters['interval'] ?? 'auto', 'from' => $filters['from'] ?? null, 'to' => $filters['to'] ?? null],
            'period' => $range->toArray(),
            'data' => Inertia::defer(fn () => $analytics->tab($tab, $range, (bool) ($filters['fresh'] ?? false))),
        ]);
    }
}
