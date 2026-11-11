<?php

namespace Tests\Feature\Workspace;

use App\Enums\OrgRole;
use App\Enums\PlanPaymentStatus;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\PlanPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_submits_a_manual_payment_and_an_admin_approves_it(): void
    {
        Storage::fake('local');
        $owner = $this->lawyer();
        $organization = $this->org($owner);
        $plan = Plan::query()->where('slug', 'basic')->firstOrFail();
        $method = PaymentMethod::query()->where('key', 'bank_transfer')->firstOrFail();

        $this->actingAs($owner)->post(route('billing.manual'), [
            'plan' => $plan->slug,
            'billing_cycle' => 'monthly',
            'payment_method_id' => $method->id,
            'account_email' => $owner->email,
            'reference' => 'TX-123',
            'screenshot' => UploadedFile::fake()->image('receipt.jpg', 800, 1200),
        ])->assertRedirect(route('billing.index'))->assertSessionHasNoErrors();

        $payment = PlanPayment::query()->firstOrFail();
        $this->assertSame(PlanPaymentStatus::AwaitingVerification, $payment->status);
        $this->assertSame($organization->id, $payment->organization_id);
        $this->assertSame('TX-123', $payment->reference);
        Storage::disk('local')->assertExists($payment->screenshot_path);

        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        $this->actingAs($admin)->post(route('admin.payments.approve', $payment))->assertRedirect()->assertSessionHasNoErrors();

        $payment->refresh();
        $this->assertSame(PlanPaymentStatus::Paid, $payment->status);
        $this->assertSame($admin->id, $payment->verified_by);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame($plan->id, $organization->fresh()->activeSubscription->plan_id);
    }

    public function test_member_without_billing_permission_cannot_submit_a_payment(): void
    {
        $owner = $this->lawyer();
        $member = $this->member($this->org($owner), OrgRole::AssociateAdvocate);
        $plan = Plan::query()->where('slug', 'basic')->firstOrFail();
        $method = PaymentMethod::query()->where('key', 'bank_transfer')->firstOrFail();

        $this->actingAs($member)->post(route('billing.manual'), [
            'plan' => $plan->slug,
            'billing_cycle' => 'monthly',
            'payment_method_id' => $method->id,
            'account_email' => $member->email,
            'screenshot' => UploadedFile::fake()->image('receipt.jpg'),
        ])->assertForbidden();

        $this->assertSame(0, PlanPayment::query()->count());
    }

    public function test_manual_payment_requires_a_screenshot(): void
    {
        $owner = $this->lawyer();
        $plan = Plan::query()->where('slug', 'basic')->firstOrFail();
        $method = PaymentMethod::query()->where('key', 'bank_transfer')->firstOrFail();

        $this->actingAs($owner)->post(route('billing.manual'), [
            'plan' => $plan->slug,
            'billing_cycle' => 'monthly',
            'payment_method_id' => $method->id,
            'account_email' => $owner->email,
        ])->assertSessionHasErrors('screenshot');

        $this->assertSame(0, PlanPayment::query()->count());
    }
}
