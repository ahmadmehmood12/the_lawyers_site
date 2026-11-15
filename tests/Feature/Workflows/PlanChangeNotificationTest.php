<?php

namespace Tests\Feature\Workflows;

use App\Models\Plan;
use App\Notifications\PlanChanged;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PlanChangeNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_switching_to_the_free_plan_emails_the_owner(): void
    {
        Notification::fake();
        $owner = $this->lawyer();
        $organization = $this->org($owner);
        $basic = Plan::query()->where('slug', 'basic')->firstOrFail();
        app(SubscriptionService::class)->start($organization, $basic);

        $this->actingAs($owner)
            ->post(route('settings.plan'), ['plan' => 'free'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Notification::assertSentTo($owner, PlanChanged::class, fn (PlanChanged $notification) => $notification->subscription->plan->slug === 'free'
            && $notification->previousPlan === 'Basic');
    }

    public function test_paid_plan_choices_are_sent_to_billing_instead_of_changing_immediately(): void
    {
        Notification::fake();
        $owner = $this->lawyer();

        $this->actingAs($owner)
            ->post(route('settings.plan'), ['plan' => 'basic'])
            ->assertRedirect(route('billing.index'));

        Notification::assertNotSentTo($owner, PlanChanged::class);
        $this->assertSame('free', $this->org($owner)->fresh()->activeSubscription->plan->slug);
    }
}
