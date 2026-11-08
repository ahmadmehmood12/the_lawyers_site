<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\Finance\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * Generic signed payment webhook. A provider adapter (pending credentials) must
 * POST JSON {invoice_id, amount, provider_reference, status} signed with
 * HMAC-SHA256(body, PAYMENT_WEBHOOK_SECRET) in X-Signature. Browser redirects
 * are never trusted as proof of payment. See docs/Modules/Finance-and-Receipts.md.
 */
class PaymentWebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, PaymentService $payments): Response
    {
        $secret = config('services.payments.webhook_secret');
        $configured = config('services.payments.gateway');

        if (! $secret || ! $configured || $provider !== $configured) {
            return response('Not configured', 404);
        }

        $signature = (string) $request->header('X-Signature');
        if (! hash_equals(hash_hmac('sha256', $request->getContent(), $secret), $signature)) {
            return response('Invalid signature', 401);
        }

        if ($request->input('status') !== 'paid') {
            return response('Ignored', 200);
        }

        $invoice = Invoice::query()->find($request->integer('invoice_id'));
        if (! $invoice) {
            return response('Unknown invoice', 404);
        }

        try {
            $payments->confirmOnline($invoice, $provider, (string) $request->input('provider_reference'), number_format((float) $request->input('amount'), 2, '.', ''));
        } catch (ValidationException $e) {
            report($e);

            return response('Rejected', 422);
        }

        return response('OK', 200);
    }
}
