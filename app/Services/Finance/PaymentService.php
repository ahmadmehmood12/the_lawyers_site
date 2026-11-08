<?php

namespace App\Services\Finance;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Notifications\PaymentReceived;
use App\Services\Cases\Timeline;
use App\Services\Support\NumberSequencer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Immutable payment ledger. Payments are only ever added (confirmed) or
 * offset by refunds — never edited or deleted. Overpayment is rejected.
 * Online payments are confirmed exclusively by verified provider webhooks.
 */
class PaymentService
{
    public function __construct(private NumberSequencer $numbers, private InvoiceService $invoices, private Timeline $timeline) {}

    /**
     * @param  array{amount: string|float, method: string, reference?: string|null, paid_on: string, notes?: string|null, idempotency_key?: string|null}  $data
     */
    public function recordManual(Invoice $invoice, User $receiver, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $receiver, $data): Payment {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if (! empty($data['idempotency_key']) && ($existing = Payment::query()->where('idempotency_key', $data['idempotency_key'])->first())) {
                return $existing;
            }

            $this->assertPayable($invoice, (string) $data['amount']);

            $payment = Payment::create([
                'organization_id' => $invoice->organization_id,
                'invoice_id' => $invoice->id,
                'client_id' => $invoice->client_id,
                'receipt_number' => $this->numbers->next($invoice->organization, 'receipt'),
                'amount' => $data['amount'],
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'paid_on' => $data['paid_on'],
                'status' => PaymentStatus::Confirmed,
                'verified_at' => now(),
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'notes' => $data['notes'] ?? null,
                'received_by' => $receiver->id,
            ]);

            $this->afterConfirmed($invoice, $payment);

            return $payment;
        });
    }

    /** Called only from a verified provider webhook. Idempotent per provider reference. */
    public function confirmOnline(Invoice $invoice, string $provider, string $providerReference, string $amount): Payment
    {
        return DB::transaction(function () use ($invoice, $provider, $providerReference, $amount): Payment {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($existing = Payment::query()->where('provider', $provider)->where('provider_reference', $providerReference)->first()) {
                return $existing;
            }

            $this->assertPayable($invoice, $amount);

            $payment = Payment::create([
                'organization_id' => $invoice->organization_id, 'invoice_id' => $invoice->id, 'client_id' => $invoice->client_id,
                'receipt_number' => $this->numbers->next($invoice->organization, 'receipt'),
                'amount' => $amount, 'method' => PaymentMethod::Online, 'paid_on' => today(), 'status' => PaymentStatus::Confirmed,
                'provider' => $provider, 'provider_reference' => $providerReference, 'reference' => $providerReference, 'verified_at' => now(),
            ]);

            $this->afterConfirmed($invoice, $payment);

            return $payment;
        });
    }

    public function refund(Payment $payment, User $actor, string $amount, string $reason, string $date): Refund
    {
        return DB::transaction(function () use ($payment, $actor, $amount, $reason, $date): Refund {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $remaining = bcsub((string) $payment->amount, $payment->refundedAmount(), 2);

            if (bccomp($amount, '0', 2) <= 0 || bccomp($amount, $remaining, 2) > 0) {
                throw ValidationException::withMessages(['amount' => __('Refund cannot exceed :amount.', ['amount' => $remaining])]);
            }

            $refund = $payment->refunds()->create(['amount' => $amount, 'reason' => $reason, 'refunded_on' => $date, 'recorded_by' => $actor->id]);
            $this->invoices->syncPaidAmount($payment->invoice);
            activity('finance')->causedBy($actor)->performedOn($payment)->withProperties(['amount' => $amount, 'reason' => $reason])->log('refund_recorded');

            return $refund;
        });
    }

    private function assertPayable(Invoice $invoice, string $amount): void
    {
        if (! in_array($invoice->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true)) {
            throw ValidationException::withMessages(['amount' => __('Payments can only be recorded against issued, unpaid invoices.')]);
        }

        $balance = bcsub((string) $invoice->total, (string) $invoice->amount_paid, 2);

        if (bccomp($amount, '0', 2) <= 0 || bccomp($amount, $balance, 2) > 0) {
            throw ValidationException::withMessages(['amount' => __('Amount must be between 1 and the outstanding balance (:balance).', ['balance' => $balance])]);
        }
    }

    private function afterConfirmed(Invoice $invoice, Payment $payment): void
    {
        $this->invoices->syncPaidAmount($invoice);
        activity('finance')->performedOn($payment)->withProperties(['amount' => (string) $payment->amount, 'method' => $payment->method->value, 'receipt' => $payment->receipt_number])->log('payment_recorded');

        if ($invoice->legalCase) {
            $this->timeline->record($invoice->legalCase, 'payment_received', __('Payment received — receipt :number', ['number' => $payment->receipt_number]), null, $payment);
        }

        DB::afterCommit(fn () => $invoice->client->user?->notify(new PaymentReceived($payment)));
    }
}
