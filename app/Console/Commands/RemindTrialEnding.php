<?php

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Notifications\TrialEnding;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

#[Signature('subscriptions:remind {--days=3 : Days before the trial ends}')]
#[Description('Email organization owners whose free trial ends soon (once per subscription)')]
class RemindTrialEnding extends Command
{
    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $sent = 0;

        Subscription::query()->where('status', SubscriptionStatus::Trialing->value)
            ->whereBetween('trial_ends_at', [now(), now()->addDays($days)->endOfDay()])
            ->with(['plan', 'organization.owner'])
            ->each(function (Subscription $subscription) use (&$sent): void {
                if (Cache::add('trial-ending-mail:'.$subscription->id, true, now()->addDays(30)) && $subscription->organization?->owner) {
                    $subscription->organization->owner->notify(new TrialEnding($subscription));
                    $sent++;
                }
            });

        $this->info("Sent {$sent} trial reminders.");

        return self::SUCCESS;
    }
}
