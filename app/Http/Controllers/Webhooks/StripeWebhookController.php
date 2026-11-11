<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\PlanPayment;
use App\Services\Payments\PlanPaymentService;
use App\Services\Payments\StripeGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Stripe Checkout webhook. The signature is verified over the raw body before
 * anything is read; only a paid session activates the plan.
 */
class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, StripeGateway $stripe, PlanPaymentService $payments): JsonResponse
    {
        $payload = $request->getContent();

        if (! $stripe->verifyWebhookPayload($payload, $request->header('Stripe-Signature'))) {
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $event = json_decode($payload, true);
        $type = $event['type'] ?? '';
        $session = $event['data']['object'] ?? [];

        if (! in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)) {
            return response()->json(['received' => true]);
        }

        if (($session['payment_status'] ?? null) !== 'paid') {
            return response()->json(['received' => true]);
        }

        $payment = PlanPayment::query()->find($session['metadata']['plan_payment_id'] ?? $session['client_reference_id'] ?? 0);

        if (! $payment || $payment->provider !== 'stripe') {
            Log::warning('Stripe webhook for unknown plan payment', ['session' => $session['id'] ?? null]);

            return response()->json(['received' => true]);
        }

        $payments->markPaid($payment, $session['payment_intent'] ?? $session['id'] ?? null);

        return response()->json(['received' => true]);
    }
}
