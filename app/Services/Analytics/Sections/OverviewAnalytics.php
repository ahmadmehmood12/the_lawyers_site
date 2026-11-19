<?php

namespace App\Services\Analytics\Sections;

use App\Enums\CaseStatus;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use Illuminate\Support\Facades\DB;

/** The headline numbers of every area for the selected range, plus all-time totals. */
class OverviewAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        $visits = fn (AnalyticsRange $r) => $r->applyDate(DB::table('page_visits'), 'visited_on');

        return [
            'kpis' => [
                'views' => $this->compare(fn (AnalyticsRange $r) => (int) $visits($r)->count()),
                'visitors' => $this->compare(fn (AnalyticsRange $r) => (int) $visits($r)->distinct()->count('visitor_hash')),
                'signups' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('users'), 'created_at')->count()),
                'cases' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('legal_cases')->whereNull('deleted_at'), 'created_at')->count()),
                'hearings' => $this->compare(fn (AnalyticsRange $r) => (int) $r->applyDate(DB::table('hearings')->where('status', 'held'), 'hearing_date')->count()),
                'appointments' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('appointments'), 'created_at')->count()),
                'revenue' => $this->compare(fn (AnalyticsRange $r) => (float) $r->apply(DB::table('plan_payments')->where('status', 'paid'), 'paid_at')->sum('amount')),
                'collected' => $this->compare(fn (AnalyticsRange $r) => (float) $r->applyDate(DB::table('payments')->where('status', 'confirmed'), 'paid_on')->sum('amount')),
                'reviews' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('reviews'), 'created_at')->count()),
                'articles' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('articles')->whereNull('deleted_at')->where('status', 'published'), 'published_at')->count()),
            ],
            'totals' => [
                'lawyers' => (int) DB::table('users')->where('account_type', 'lawyer')->count(),
                'verified' => (int) DB::table('lawyer_profiles')->where('verification_status', 'approved')->count(),
                'pending_verification' => (int) DB::table('lawyer_profiles')->whereIn('verification_status', ['submitted', 'under_review'])->count(),
                'firms' => (int) DB::table('organizations')->whereNull('deleted_at')->where('type', 'firm')->count(),
                'clients' => (int) DB::table('clients')->whereNull('deleted_at')->count(),
                'client_accounts' => (int) DB::table('users')->where('account_type', 'client')->count(),
                'active_cases' => (int) DB::table('legal_cases')->whereNull('deleted_at')->whereIn('status', CaseStatus::openValues())->count(),
                'paid_subscriptions' => (int) DB::table('subscriptions')->whereIn('subscriptions.status', ['active', 'trialing'])
                    ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')->where('plans.price_monthly', '>', 0)->count(),
            ],
            'activity' => $this->combine([
                'signups' => $this->series(DB::table('users'), 'created_at'),
                'cases' => $this->series(DB::table('legal_cases')->whereNull('deleted_at'), 'created_at'),
                'appointments' => $this->series(DB::table('appointments'), 'created_at'),
            ], ['signups' => __('New accounts'), 'cases' => __('New cases'), 'appointments' => __('Appointments booked')]),
            'traffic' => $this->combine([
                'views' => $this->series(DB::table('page_visits'), 'visited_at'),
                'visitors' => $this->series(DB::table('page_visits'), 'visited_at', 'COUNT(DISTINCT visitor_hash)'),
            ], ['views' => __('Page views'), 'visitors' => __('Unique visitors')]),
            'tracking_since' => DB::table('page_visits')->min('visited_on'),
        ];
    }
}
