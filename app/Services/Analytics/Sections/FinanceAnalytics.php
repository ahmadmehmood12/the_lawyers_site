<?php

namespace App\Services\Analytics\Sections;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PlanPaymentStatus;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use Illuminate\Support\Facades\DB;

/**
 * Two kinds of money, kept apart:
 *  - platform revenue: plan payments verified as paid, subscriptions and their monthly value;
 *  - practice finance: what chambers invoice their clients and collect (totals across all
 *    chambers, never one client's account).
 */
class FinanceAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        return [
            'platform' => $this->platform(),
            'practice' => $this->practice(),
        ];
    }

    private function platform(): array
    {
        $paid = fn (?AnalyticsRange $r = null) => ($r ?? $this->range)->apply(DB::table('plan_payments')->where('status', 'paid'), 'paid_at');
        $active = DB::table('subscriptions')->whereIn('subscriptions.status', ['active', 'trialing'])
            ->where(fn ($q) => $q->whereNull('subscriptions.ends_at')->orWhere('subscriptions.ends_at', '>', now()))
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id');

        $monthlyValue = (float) (clone $active)->where('subscriptions.status', 'active')
            ->selectRaw("COALESCE(SUM(CASE WHEN subscriptions.billing_cycle = 'yearly' THEN plans.price_yearly / 12 ELSE plans.price_monthly END), 0) as mrr")->value('mrr');

        return [
            'kpis' => [
                'revenue' => $this->compare(fn (AnalyticsRange $r) => (float) $paid($r)->sum('amount')),
                'payments' => $this->compare(fn (AnalyticsRange $r) => (int) $paid($r)->count()),
                'awaiting' => [
                    'count' => (int) DB::table('plan_payments')->whereIn('status', ['pending', 'awaiting_verification'])->count(),
                    'amount' => (float) DB::table('plan_payments')->whereIn('status', ['pending', 'awaiting_verification'])->sum('amount'),
                ],
                'mrr' => round($monthlyValue, 2),
                'paid_subscriptions' => (int) (clone $active)->where('plans.price_monthly', '>', 0)->count(),
                'new_subscriptions' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('subscriptions')->join('plans', 'plans.id', '=', 'subscriptions.plan_id')->where('plans.price_monthly', '>', 0), 'subscriptions.created_at')->count()),
                'expiring_30' => (int) DB::table('subscriptions')->whereIn('status', ['active', 'trialing'])->whereBetween('ends_at', [now(), now()->addDays(30)])->count(),
            ],
            'trend' => $this->series(DB::table('plan_payments')->where('status', 'paid'), 'paid_at', 'COALESCE(SUM(amount), 0)'),
            'by_plan' => (clone $paid())->join('plans', 'plans.id', '=', 'plan_payments.plan_id')
                ->selectRaw('plans.slug, plans.name, COALESCE(SUM(plan_payments.amount), 0) as total, COUNT(*) as payments')
                ->groupBy('plans.slug', 'plans.name')->orderByDesc('total')->get()
                ->map(fn ($row) => ['key' => $row->slug, 'label' => $row->name, 'value' => (float) $row->total, 'payments' => (int) $row->payments])->all(),
            'subscriptions' => (clone $active)->selectRaw('plans.slug, plans.name, COUNT(*) as total')->groupBy('plans.slug', 'plans.name', 'plans.sort_order')
                ->orderBy('plans.sort_order')->get()->map(fn ($row) => ['key' => $row->slug, 'label' => $row->name, 'value' => (int) $row->total])->all(),
            'payment_statuses' => $this->enumCounts($this->range->apply(DB::table('plan_payments'), 'created_at'), 'status', PlanPaymentStatus::class),
        ];
    }

    private function practice(): array
    {
        $invoiced = fn (AnalyticsRange $r) => $r->applyDate(DB::table('invoices')->whereNotIn('status', ['draft', 'void']), 'issue_date');
        $collected = fn (AnalyticsRange $r) => $r->applyDate(DB::table('payments')->where('status', 'confirmed'), 'paid_on');
        $refunded = fn (AnalyticsRange $r) => (float) $r->applyDate(DB::table('refunds'), 'refunded_on')->sum('amount');
        $open = DB::table('invoices')->whereIn('status', ['issued', 'partially_paid']);
        $today = now()->toDateString();

        return [
            'kpis' => [
                'invoiced' => $this->compare(fn (AnalyticsRange $r) => (float) $invoiced($r)->sum('total')),
                'collected' => $this->compare(fn (AnalyticsRange $r) => (float) $collected($r)->sum('amount') - $refunded($r)),
                'refunds' => $this->compare($refunded),
                'outstanding' => (float) (clone $open)->sum(DB::raw('total - amount_paid')),
                'overdue' => (float) (clone $open)->where('due_date', '<', $today)->sum(DB::raw('total - amount_paid')),
                'overdue_count' => (int) (clone $open)->where('due_date', '<', $today)->count(),
                'expenses' => $this->compare(fn (AnalyticsRange $r) => (float) $r->applyDate(DB::table('case_expenses'), 'incurred_on')->sum('amount')),
                'collection_rate' => $this->collectionRate(),
            ],
            'trend' => $this->combine([
                'invoiced' => $this->series(DB::table('invoices')->whereNotIn('status', ['draft', 'void']), 'issue_date', 'COALESCE(SUM(total), 0)', true),
                'collected' => $this->series(DB::table('payments')->where('status', 'confirmed'), 'paid_on', 'COALESCE(SUM(amount), 0)', true),
            ], ['invoiced' => __('Invoiced'), 'collected' => __('Collected')]),
            'invoice_statuses' => $this->enumCounts($this->range->applyDate(DB::table('invoices'), 'issue_date'), 'status', InvoiceStatus::class),
            'methods' => $this->grouped($collected($this->range), 'method', PaymentMethod::class, 'COALESCE(SUM(amount), 0)'),
            'expense_categories' => $this->grouped($this->range->applyDate(DB::table('case_expenses'), 'incurred_on'), 'category', aggregate: 'COALESCE(SUM(amount), 0)'),
            'ageing' => $this->ageing(),
        ];
    }

    /** Share of the value invoiced in the range that has been paid. */
    private function collectionRate(): ?float
    {
        $row = $this->range->applyDate(DB::table('invoices')->whereNotIn('status', ['draft', 'void']), 'issue_date')
            ->selectRaw('COALESCE(SUM(total), 0) as total, COALESCE(SUM(amount_paid), 0) as paid')->first();

        return $row && (float) $row->total > 0 ? round(((float) $row->paid / (float) $row->total) * 100, 1) : null;
    }

    /** Unpaid balances by how long they are past due. */
    private function ageing(): array
    {
        $row = DB::table('invoices')->whereIn('status', ['issued', 'partially_paid'])->selectRaw('
            COALESCE(SUM(CASE WHEN due_date IS NULL OR due_date >= CURDATE() THEN total - amount_paid END), 0) as current_due,
            COALESCE(SUM(CASE WHEN due_date < CURDATE() AND due_date >= CURDATE() - INTERVAL 30 DAY THEN total - amount_paid END), 0) as d30,
            COALESCE(SUM(CASE WHEN due_date < CURDATE() - INTERVAL 30 DAY AND due_date >= CURDATE() - INTERVAL 90 DAY THEN total - amount_paid END), 0) as d90,
            COALESCE(SUM(CASE WHEN due_date < CURDATE() - INTERVAL 90 DAY THEN total - amount_paid END), 0) as older')->first();

        return [
            ['key' => 'current', 'label' => __('Not yet due'), 'value' => (float) $row->current_due],
            ['key' => '1_30', 'label' => __('1 to 30 days overdue'), 'value' => (float) $row->d30],
            ['key' => '31_90', 'label' => __('31 to 90 days overdue'), 'value' => (float) $row->d90],
            ['key' => '90_plus', 'label' => __('Over 90 days overdue'), 'value' => (float) $row->older],
        ];
    }
}
