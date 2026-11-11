<?php

namespace App\Services\Payments;

use App\Models\PlanPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Minimal Stripe Checkout client using the REST API (no SDK dependency).
 * Card data never touches this application: the customer pays on Stripe's
 * hosted page and a signed webhook or a server-side session lookup confirms it.
 */
class StripeGateway
{
    private const BASE = 'https://api.stripe.com/v1';

    public function isConfigured(): bool
    {
        return filled(config('services.stripe.secret'));
    }

    public function publicKey(): ?string
    {
        return config('services.stripe.key') ?: null;
    }

    /**
     * Creates a hosted Checkout Session and returns its id + redirect URL.
     *
     * @return array{id: string, url: string}
     */
    public function createCheckoutSession(PlanPayment $payment): array
    {
        $this->ensureConfigured();
        $payment->loadMissing('plan');

        $cycle = $payment->billing_cycle === 'yearly' ? __('year') : __('month');
        $name = __(':plan plan (:cycle)', ['plan' => $payment->plan->name, 'cycle' => $cycle]);

        $response = Http::asForm()
            ->withToken((string) config('services.stripe.secret'))
            ->timeout(20)
            ->post(self::BASE.'/checkout/sessions', [
                'mode' => 'payment',
                'customer_email' => $payment->account_email,
                'client_reference_id' => (string) $payment->id,
                'success_url' => route('billing.return').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('billing.index'),
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => strtolower((string) config('services.stripe.currency', 'PKR')),
                        'unit_amount' => (int) round(((float) $payment->amount) * 100),
                        'product_data' => ['name' => $name],
                    ],
                ]],
                'metadata' => [
                    'plan_payment_id' => (string) $payment->id,
                    'organization_id' => (string) $payment->organization_id,
                    'plan' => $payment->plan->slug,
                    'billing_cycle' => $payment->billing_cycle,
                ],
            ]);

        $response->throw();

        return ['id' => (string) $response->json('id'), 'url' => (string) $response->json('url')];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function retrieveSession(string $sessionId): ?array
    {
        if (! $this->isConfigured() || $sessionId === '') {
            return null;
        }

        try {
            $response = Http::withToken((string) config('services.stripe.secret'))
                ->timeout(20)
                ->get(self::BASE.'/checkout/sessions/'.urlencode($sessionId));

            return $response->successful() ? (array) $response->json() : null;
        } catch (Throwable $e) {
            Log::warning('Stripe session lookup failed', ['session' => $sessionId, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Verifies a Stripe-Signature header (t=timestamp,v1=signature) over the
     * raw request body, rejecting timestamps older than five minutes.
     */
    public function verifyWebhookPayload(string $payload, ?string $signatureHeader): bool
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret === '' || blank($signatureHeader)) {
            return false;
        }

        $timestamp = null;
        $signatures = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
            if ($key === 't') {
                $timestamp = $value;
            } elseif ($key === 'v1') {
                $signatures[] = $value;
            }
        }

        if ($timestamp === null || ! ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);
        foreach ($signatures as $signature) {
            if (hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException(__('Stripe is not configured.'));
        }
    }
}
