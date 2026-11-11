<?php

namespace App\Services\Subscriptions;

use App\Enums\CaseStatus;
use App\Enums\MembershipStatus;
use App\Enums\PlanFeature;
use App\Enums\SubscriptionStatus;
use App\Exceptions\PlanLimitReached;
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

    /** Stops the action with the Upgrade modal when one more record would pass the plan. */
    public function ensureCanAdd(Organization $organization, PlanFeature $feature): void
    {
        if (! $this->canAdd($organization, $feature)) {
            throw new PlanLimitReached($this->upgradeOffer($organization, $feature));
        }
    }

    /**
     * What the Upgrade modal shows: the limit hit, the current plan and the cheapest active plan that
     * raises this limit (same audience first), with a side by side comparison and its price.
     *
     * @return array<string, mixed>
     */
    public function upgradeOffer(Organization $organization, PlanFeature $feature, ?int $used = null): array
    {
        $current = $this->planFor($organization);
        $limit = $current?->limitFor($feature);
        $audience = $organization->type?->value === 'firm' ? 'firm' : 'lawyer';
        $raises = fn (Plan $plan) => ($next = $plan->limitFor($feature)) === null || ($limit !== null && $next > $limit);

        $candidates = Plan::query()->where('is_active', true)->where('price_monthly', '>', (float) ($current?->price_monthly ?? 0))
            ->with('features')->orderBy('price_monthly')->get()->filter($raises);
        $next = $candidates->firstWhere('audience', $audience) ?? $candidates->first();

        $compare = [PlanFeature::MaxActiveCases, PlanFeature::MaxClients, PlanFeature::MaxTeamMembers, PlanFeature::StorageMb, PlanFeature::WhatsAppReminders, PlanFeature::AiAssistant, PlanFeature::Analytics];
        $ur = app()->getLocale() === 'ur';

        return [
            'feature' => $feature->value,
            'feature_label' => $feature->label(),
            'limit' => $limit,
            'used' => $used ?? $limit,
            'message' => __('You have reached your plan’s limit for :feature.', ['feature' => mb_strtolower($feature->label())]),
            'current' => $current ? ['slug' => $current->slug, 'name' => $ur && $current->name_ur ? $current->name_ur : $current->name] : null,
            'next' => $next ? [
                'slug' => $next->slug,
                'name' => $ur && $next->name_ur ? $next->name_ur : $next->name,
                'description' => $next->description,
                'price_monthly' => (float) $next->price_monthly,
                'price_yearly' => (float) $next->price_yearly,
                'trial_days' => (int) $next->trial_days,
                'url' => route('billing.index', ['plan' => $next->slug]),
            ] : null,
            'rows' => collect($compare)->map(fn (PlanFeature $f) => [
                'key' => $f->value,
                'label' => $f->label(),
                'current' => $current?->limitFor($f),
                'next' => $next?->limitFor($f),
                'highlight' => $f === $feature,
            ])->all(),
            'plans_url' => route('billing.index'),
        ];
    }
}
