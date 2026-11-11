<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\PaymentMethodKind;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\PlanPayment;
use App\Services\Access\OrganizationAccess;
use App\Services\Payments\PlanPaymentService;
use App\Services\Payments\StripeGateway;
use App\Services\Subscriptions\SubscriptionService;
use App\Support\ImageReencoder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Buy or renew a plan with Stripe or a manual transfer (docs/Modules/Administration.md). */
class BillingController extends Controller
{
    public function index(Request $request, SubscriptionService $subscriptions): Response
    {
        $organization = $this->organization();
        $subscription = $organization->activeSubscription()->with('plan')->first();

        return Inertia::render('Workspace/Billing/Index', [
            'canManage' => $this->canManage($request),
            'stripeConfigured' => app(StripeGateway::class)->isConfigured(),
            'subscription' => [
                'plan' => $subscription?->plan?->name,
                'status' => $subscription?->status->label(),
                'ends_at' => $subscription?->ends_at?->toDateString(),
                'trial_ends_at' => $subscription?->trial_ends_at?->toDateString(),
                'billing_cycle' => $subscription?->billing_cycle,
            ],
            'plans' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn (Plan $plan) => [
                    'id' => $plan->id,
                    'slug' => $plan->slug,
                    'name' => $plan->name,
                    'audience' => $plan->audience,
                    'description' => $plan->description,
                    'price_monthly' => (float) $plan->price_monthly,
                    'price_yearly' => (float) $plan->price_yearly,
                    'trial_days' => $plan->trial_days,
                ]),
            'methods' => PaymentMethod::query()->enabled()->get()->map(fn (PaymentMethod $method) => [
                'id' => $method->id,
                'key' => $method->key,
                'name' => $method->name,
                'kind' => $method->kind->value,
                'instructions' => $method->instructions,
                'details' => collect($method->details ?? [])->filter(fn ($row) => filled($row['value'] ?? null))->values(),
            ]),
            'payments' => PlanPayment::query()->forOrganization($organization)->with(['plan:id,name', 'method:id,name'])
                ->latest()->limit(10)->get()->map(fn (PlanPayment $payment) => [
                    'id' => $payment->id,
                    'plan' => $payment->plan?->name,
                    'method' => $payment->method?->name,
                    'billing_cycle' => $payment->billing_cycle,
                    'amount' => (string) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status->value,
                    'status_label' => $payment->status->label(),
                    'reference' => $payment->reference,
                    'admin_notes' => $payment->admin_notes,
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                ]),
            'currentPlan' => $subscriptions->planFor($organization)?->slug,
            'defaultEmail' => $request->user()->email,
        ]);
    }

    public function checkout(Request $request, PlanPaymentService $payments, StripeGateway $stripe): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $data = $this->validatePurchase($request);
        $method = $this->method($data['payment_method_id']);

        if ($method->kind !== PaymentMethodKind::Stripe) {
            throw ValidationException::withMessages(['payment_method_id' => __('Choose the manual payment form for this method.')]);
        }

        if (! $stripe->isConfigured()) {
            throw ValidationException::withMessages(['payment_method_id' => __('Card payments are not configured yet. Please use a manual method.')]);
        }

        $payment = $payments->createStripe($this->organization(), $request->user(), $data['plan'], $method, $data['billing_cycle']);
        $session = $stripe->createCheckoutSession($payment);
        $payment->forceFill(['provider_reference' => $session['id']])->save();

        return redirect()->away($session['url']);
    }

    public function manual(Request $request, PlanPaymentService $payments): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $data = $this->validatePurchase($request);
        $method = $this->method($data['payment_method_id']);

        if ($method->kind !== PaymentMethodKind::Manual) {
            throw ValidationException::withMessages(['payment_method_id' => __('Use card checkout for this method.')]);
        }

        $validated = $request->validate([
            'account_email' => ['required', 'email', 'max:255'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'screenshot' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = ImageReencoder::fittedJpeg($request->file('screenshot'), 'plan-payments', 1600, 'local');

        $payment = $payments->createManual($this->organization(), $request->user(), $data['plan'], $method, $data['billing_cycle'], [
            'account_email' => $validated['account_email'],
            'reference' => $validated['reference'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'screenshot_path' => $path,
        ]);

        return redirect()->route('billing.index')->with('success', __('Payment submitted. Your plan will be activated after verification, usually within 24 hours.'));
    }

    public function return(Request $request, StripeGateway $stripe, PlanPaymentService $payments): RedirectResponse
    {
        $sessionId = $request->string('session_id')->toString();
        $session = $stripe->retrieveSession($sessionId);

        if (! $session) {
            return redirect()->route('billing.index')->with('error', __('We could not confirm this card payment. If you were charged, contact support.'));
        }

        $payment = PlanPayment::query()
            ->forOrganization($this->organization())
            ->find($session['metadata']['plan_payment_id'] ?? $session['client_reference_id'] ?? 0);

        if (! $payment) {
            return redirect()->route('billing.index')->with('error', __('Payment not found for this organization.'));
        }

        if (($session['payment_status'] ?? null) === 'paid') {
            $payments->markPaid($payment, $session['payment_intent'] ?? $session['id'] ?? null);

            return redirect()->route('billing.index')->with('success', __('Payment received. Your plan is now active.'));
        }

        return redirect()->route('billing.index')->with('error', __('Payment is still processing. We will activate your plan once Stripe confirms it.'));
    }

    private function canManage(Request $request): bool
    {
        return app(OrganizationAccess::class)->allows($request->user(), $this->organization(), 'organization.settings');
    }

    /**
     * @return array{plan: Plan, billing_cycle: string, payment_method_id: int}
     */
    private function validatePurchase(Request $request): array
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', Rule::exists('plans', 'slug')->where('is_active', true)],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
            'payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
        ]);

        $plan = Plan::query()->where('slug', $validated['plan'])->where('is_active', true)->firstOrFail();

        $price = (float) ($validated['billing_cycle'] === 'yearly' ? $plan->price_yearly : $plan->price_monthly);

        if ($price <= 0) {
            throw ValidationException::withMessages(['plan' => __('The free plan does not need a payment.')]);
        }

        return ['plan' => $plan, 'billing_cycle' => $validated['billing_cycle'], 'payment_method_id' => (int) $validated['payment_method_id']];
    }

    private function method(int $id): PaymentMethod
    {
        return PaymentMethod::query()->whereKey($id)->where('is_enabled', true)->firstOrFail();
    }
}
