<?php

namespace App\Services\Subscriptions;

use App\Enums\CaseStatus;
use App\Enums\MembershipStatus;
use App\Enums\PlanFeature;
use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Subscription;

/**
 * Plan entitlements. Limits come from the plan_features table — never hardcoded.
 * Expiry never removes access to existing records; it only blocks creating
 * new ones beyond the free plan's limits. See docs/Modules/Administration.md.
 */
class SubscriptionService
{
    public function startDefault(Organization $organization): ?Subscription
    {
        $slug = Setting::get('default_plan', 'free');
        $plan = Plan::query()->where('slug', $slug)->where('is_active', true)->first();

        if (! $plan) {
            return null;
        }

        return $this->start($organization, $plan);
    }

    public function start(Organization $organization, Plan $plan, string $cycle = 'monthly'): Subscription
    {
        $organization->subscriptions()
            ->whereIn('status', [SubscriptionStatus::Trialing->value, SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->update(['status' => SubscriptionStatus::Cancelled->value, 'cancelled_at' => now(), 'ends_at' => now()]);

        $trial = $plan->trial_days > 0 && $plan->price_monthly > 0;

        return $organization->subscriptions()->create([
            'plan_id' => $plan->id,
            'status' => $trial ? SubscriptionStatus::Trialing : SubscriptionStatus::Active,
            'billing_cycle' => $cycle,
            'starts_at' => now(),
            'trial_ends_at' => $trial ? now()->addDays($plan->trial_days) : null,
            'ends_at' => $plan->price_monthly > 0 ? ($trial ? now()->addDays($plan->trial_days) : ($cycle === 'yearly' ? now()->addYear() : now()->addMonth())) : null,
        ]);
    }

    /** The plan currently in force; falls back to the free plan when nothing is active. */
    public function planFor(Organization $organization): ?Plan
    {
        $plan = $organization->activeSubscription?->plan;

        return ($plan ?? Plan::query()->where('slug', Setting::get('default_plan', 'free'))->first())?->loadMissing('features');
    }

    public function limit(Organization $organization, PlanFeature $feature): ?int
    {
        $plan = $this->planFor($organization);

        return $plan ? $plan->limitFor($feature) : null;
    }

    public function enabled(Organization $organization, PlanFeature $feature): bool
    {
        $limit = $this->limit($organization, $feature);

        return $limit === null || $limit > 0;
    }

    /** Whether one more record of a counted resource may be created. */
    public function canAdd(Organization $organization, PlanFeature $feature): bool
    {
        $limit = $this->limit($organization, $feature);

        if ($limit === null) {
            return true;
        }

        $used = match ($feature) {
            PlanFeature::MaxActiveCases => $organization->cases()->whereIn('status', CaseStatus::openValues())->count(),
            PlanFeature::MaxClients => $organization->clients()->count(),
            PlanFeature::MaxTeamMembers => $organization->members()->where('status', MembershipStatus::Active->value)->count(),
            default => 0,
        };

        return $used < $limit;
    }
}
