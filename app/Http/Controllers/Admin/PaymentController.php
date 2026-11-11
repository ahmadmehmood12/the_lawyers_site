<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentMethodKind;
use App\Enums\PlanPaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\PlanPayment;
use App\Services\Payments\PlanPaymentService;
use App\Services\Payments\StripeGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Admin control over how plans are paid for and manual payment verification.
 * Manual payments activate a subscription only after an admin approves them.
 */
class PaymentController extends Controller
{
    public function methods(): Response
    {
        return Inertia::render('Admin/PaymentMethods', [
            'methods' => PaymentMethod::query()->orderBy('sort_order')->orderBy('name')->get()->map(fn (PaymentMethod $method) => [
                'id' => $method->id,
                'key' => $method->key,
                'name' => $method->name,
                'kind' => $method->kind->value,
                'is_enabled' => $method->is_enabled,
                'instructions' => $method->instructions,
                'details' => $method->details ?? [],
                'sort_order' => $method->sort_order,
            ]),
            'kinds' => PaymentMethodKind::options(),
            'stripeConfigured' => app(StripeGateway::class)->isConfigured(),
        ]);
    }

    public function storeMethod(Request $request): RedirectResponse
    {
        $data = $this->validateMethod($request);

        PaymentMethod::query()->create($data);
        $this->audit($request, 'payment_method_created', ['key' => $data['key']]);

        return back()->with('success', __('Payment method added.'));
    }

    public function updateMethod(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $data = $this->validateMethod($request, $paymentMethod);

        $paymentMethod->update($data);
        $this->audit($request, 'payment_method_updated', ['key' => $paymentMethod->key, 'enabled' => $paymentMethod->is_enabled]);

        return back()->with('success', __('Payment method saved.'));
    }

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->trim()->toString();

        $rows = PlanPayment::query()->with(['plan:id,name', 'method:id,name', 'organization:id,name', 'user:id,name,email'])
            ->when(in_array($status, PlanPaymentStatus::values(), true), fn ($q) => $q->where('status', $status))
            ->when($search, fn ($q) => $q->where(fn ($w) => $w
                ->where('account_email', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
                ->orWhereHas('organization', fn ($o) => $o->where('name', 'like', "%{$search}%"))))
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn (PlanPayment $payment) => [
                'id' => $payment->id,
                'organization' => $payment->organization?->name,
                'user' => $payment->user?->name,
                'email' => $payment->account_email,
                'plan' => $payment->plan?->name,
                'method' => $payment->method?->name,
                'billing_cycle' => $payment->billing_cycle,
                'amount' => (string) $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'admin_notes' => $payment->admin_notes,
                'has_screenshot' => filled($payment->screenshot_path),
                'screenshot_url' => $payment->screenshot_path ? route('admin.payments.screenshot', $payment) : null,
                'provider_reference' => $payment->provider_reference,
                'created_at' => $payment->created_at?->toIso8601String(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/PlanPayments', [
            'rows' => $rows,
            'filters' => ['status' => $status, 'search' => $search],
            'statuses' => PlanPaymentStatus::options(),
            'counts' => PlanPayment::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function approve(Request $request, PlanPayment $planPayment, PlanPaymentService $payments): RedirectResponse
    {
        if ($planPayment->status === PlanPaymentStatus::Paid) {
            return back()->with('error', __('This payment is already marked paid.'));
        }

        $data = $request->validate(['admin_notes' => ['nullable', 'string', 'max:2000']]);

        $payments->markPaid($planPayment, $planPayment->provider_reference, $request->user(), $data['admin_notes'] ?? null);
        $this->audit($request, 'plan_payment_approved', ['id' => $planPayment->id, 'amount' => (string) $planPayment->amount]);

        return back()->with('success', __('Payment approved and plan activated.'));
    }

    public function reject(Request $request, PlanPayment $planPayment, PlanPaymentService $payments): RedirectResponse
    {
        if ($planPayment->status === PlanPaymentStatus::Paid) {
            return back()->with('error', __('A paid payment cannot be rejected.'));
        }

        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        $payments->reject($planPayment, $request->user(), $data['reason']);
        $this->audit($request, 'plan_payment_rejected', ['id' => $planPayment->id]);

        return back()->with('success', __('Payment rejected.'));
    }

    public function screenshot(PlanPayment $planPayment): BinaryFileResponse
    {
        abort_unless($planPayment->screenshot_path && Storage::disk('local')->exists($planPayment->screenshot_path), 404);

        return response()->file(Storage::disk('local')->path($planPayment->screenshot_path), [
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMethod(Request $request, ?PaymentMethod $method = null): array
    {
        $data = $request->validate([
            'key' => ['required', 'alpha_dash', 'max:40', Rule::unique('payment_methods', 'key')->ignore($method?->id)],
            'name' => ['required', 'string', 'max:120'],
            'kind' => ['required', Rule::enum(PaymentMethodKind::class)],
            'is_enabled' => ['boolean'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'details' => ['nullable', 'array', 'max:12'],
            'details.*.label' => ['required_with:details', 'string', 'max:80'],
            'details.*.value' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        $data['is_enabled'] = (bool) ($data['is_enabled'] ?? false);
        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $data['details'] = collect($data['details'] ?? [])
            ->filter(fn ($row) => filled($row['label'] ?? null))
            ->map(fn ($row) => ['label' => $row['label'], 'value' => $row['value'] ?? ''])
            ->values()
            ->all();

        return $data;
    }

    /** @param array<string, mixed> $properties */
    private function audit(Request $request, string $event, array $properties): void
    {
        activity('admin')->causedBy($request->user())->withProperties($properties)->log($event);
    }
}
