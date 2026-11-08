<?php

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Marks ended subscriptions as expired. Organizations keep full access to
 * existing records; only plan-limited creation falls back to the free plan.
 */
#[Signature('subscriptions:expire')]
#[Description('Expire subscriptions whose period has ended')]
class ExpireSubscriptions extends Command
{
    public function handle(): int
    {
        $count = Subscription::query()
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::Trialing->value, SubscriptionStatus::PastDue->value])
            ->whereNotNull('ends_at')->where('ends_at', '<=', now())
            ->update(['status' => SubscriptionStatus::Expired->value]);

        $this->info("Expired {$count} subscriptions.");

        return self::SUCCESS;
    }
}
