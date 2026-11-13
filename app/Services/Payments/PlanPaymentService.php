<?php

namespace App\Services\Payments;

use App\Enums\PlanPaymentStatus;
use App\Models\Organization;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\PlanPayment;
use App\Models\User;
use App\Notifications\PlanActivated;
use App\Notifications\PlanPaymentReceived;
use App\Notifications\PlanPaymentRejected;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Lifecycle of a plan purchase: create the request, then either verify a
 * manual transfer or fulfil a Stripe Checkout session. Activation always goes
 * through SubscriptionService so plan limits stay in one place.
 */
class PlanPaymentService
{
    public function __construct(private SubscriptionService $subscriptions) {}

    public function amountFor(Plan $plan, string $cycle): float
    {
        return (float) ($cycle === 'yearly' ? $plan->price_yearly : $plan->price_monthly);
    }

    /** @param array{account_email: string, reference?: ?string, notes?: ?string, screenshot_path?: ?string} $data */
    public function createManual(Organization $organization, User $user, Plan $plan, PaymentMethod $method, string $cycle, array $data): PlanPayment
    {
        $payment = PlanPayment::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method_id' => $method->id,
            'billing_cycle' => $cycle,
            'amount' => $this->amountFor($plan, $cycle),
            'currency' => (string) config('services.stripe.currency', 'PKR'),
            'status' => PlanPaymentStatus::AwaitingVerification,
            'account_email' => $data['account_email'],
            'reference' => $data['reference'] ?? null,
            'screenshot_path' => $data['screenshot_path'] ?? null,
            'notes' => $data['notes'] ?? null,
            'provider' => 'manual',
        ]);

        activity('billing')->causedBy($user)->performedOn($payment)
            ->withProperties(['plan' => $plan->slug, 'cycle' => $cycle, 'amount' => (string) $payment->amount])
            ->log('plan_payment_submitted');

        $user->notify(new PlanPaymentReceived($payment));

        return $payment;
    }

    public function createStripe(Organization $organization, User $user, Plan $plan, PaymentMethod $method, string $cycle): PlanPayment
    {
        return PlanPayment::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method_id' => $method->id,
            'billing_cycle' => $cycle,
            'amount' => $this->amountFor($plan, $cycle),
            'currency' => (string) config('services.stripe.currency', 'PKR'),
            'status' => PlanPaymentStatus::Pending,
            'account_email' => $user->email,
            'provider' => 'stripe',
        ]);
    }

    public function markPaid(PlanPayment $payment, ?string $providerReference = null, ?User $verifiedBy = null, ?string $adminNotes = null): PlanPayment
    {
        if ($payment->status === PlanPaymentStatus::Paid) {
            return $payment;
        }

        return DB::transaction(function () use ($payment, $providerReference, $verifiedBy, $adminNotes): PlanPayment {
            $payment->forceFill([
                'status' => PlanPaymentStatus::Paid,
                'provider_reference' => $providerReference ?: $payment->provider_reference,
                'paid_at' => $payment->paid_at ?? now(),
                'verified_at' => $verifiedBy ? now() : $payment->verified_at,
                'verified_by' => $verifiedBy?->id,
                'admin_notes' => $adminNotes ?: $payment->admin_notes,
            ])->save();

            $subscription = $this->subscriptions->start($payment->organization, $payment->plan, $payment->billing_cycle);
            DB::afterCommit(function () use ($payment, $subscription): void {
                collect([$payment->user, $payment->organization->owner])->filter()->unique('id')
                    ->each(fn (User $user) => $user->notify(new PlanActivated($subscription, $payment)));
            });

            activity('billing')->causedBy($verifiedBy)->performedOn($payment)
                ->withProperties(['plan' => $payment->plan->slug, 'cycle' => $payment->billing_cycle, 'amount' => (string) $payment->amount, 'reference' => $payment->provider_reference])
                ->log('plan_payment_paid');

            return $payment->refresh();
        });
    }

    public function reject(PlanPayment $payment, User $admin, string $reason): PlanPayment
    {
        $payment->forceFill([
            'status' => PlanPaymentStatus::Rejected,
            'admin_notes' => $reason,
            'verified_at' => now(),
            'verified_by' => $admin->id,
        ])->save();

        activity('billing')->causedBy($admin)->performedOn($payment)
            ->withProperties(['reason' => $reason])
            ->log('plan_payment_rejected');

        $payment->user?->notify(new PlanPaymentRejected($payment, $reason));

        return $payment;
    }

    public function fail(PlanPayment $payment, ?string $reason = null): void
    {
        if ($payment->status === PlanPaymentStatus::Paid) {
            return;
        }

        $payment->forceFill(['status' => PlanPaymentStatus::Failed, 'admin_notes' => $reason ?: $payment->admin_notes])->save();
    }

    public function deleteScreenshot(PlanPayment $payment): void
    {
        if ($payment->screenshot_path) {
            Storage::disk('local')->delete($payment->screenshot_path);
        }
    }
}
