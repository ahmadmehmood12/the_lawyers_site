<?php

namespace App\Services\Finance;

use App\Enums\InvoiceStatus;
use App\Models\CaseExpense;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;
use App\Services\Cases\Timeline;
use App\Services\Support\NumberSequencer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Invoice lifecycle: draft (editable) → issued → partially_paid → paid, or void.
 * Issued invoices are never edited; mistakes are corrected by voiding and re-issuing.
 * Amounts use bcmath on decimal strings to avoid float rounding.
 */
class InvoiceService
{
    public function __construct(private NumberSequencer $numbers, private Timeline $timeline) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function saveDraft(Organization $organization, User $actor, array $data, ?Invoice $invoice = null): Invoice
    {
        if ($invoice && ! $invoice->isEditable()) {
            throw ValidationException::withMessages(['items' => __('Issued invoices cannot be edited. Void and re-issue instead.')]);
        }

        $client = Client::query()->forOrganization($organization)->findOrFail($data['client_id']);
        $case = isset($data['legal_case_id']) ? LegalCase::query()->forOrganization($organization)->findOrFail($data['legal_case_id']) : null;

        if ($case && ! $case->clients()->whereKey($client->id)->exists()) {
            throw ValidationException::withMessages(['legal_case_id' => __('The selected case is not linked to this client.')]);
        }

        return DB::transaction(function () use ($organization, $actor, $data, $invoice, $client, $case): Invoice {
            $invoice ??= new Invoice(['organization_id' => $organization->id, 'status' => InvoiceStatus::Draft, 'created_by' => $actor->id, 'number' => 'DRAFT-'.uniqid()]);
            $invoice->fill([
                'client_id' => $client->id,
                'legal_case_id' => $case?->id,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'] ?? null,
                'discount' => $data['discount'] ?? 0,
                'tax_rate' => $data['tax_rate'] ?? 0,
                'notes' => $data['notes'] ?? null,
            ])->save();

            CaseExpense::query()->where('invoice_item_id', '!=', null)->whereIn('invoice_item_id', $invoice->items()->select('id'))->update(['invoice_item_id' => null]);
            $invoice->items()->delete();

            foreach (array_values($data['items']) as $index => $item) {
                $amount = bcmul((string) $item['quantity'], (string) $item['unit_price'], 2);
                $row = $invoice->items()->create([
                    'type' => $item['type'], 'description' => $item['description'], 'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'], 'amount' => $amount, 'sort_order' => $index,
                ]);

                if (! empty($item['expense_id'])) {
                    CaseExpense::query()->forOrganization($organization)->whereKey($item['expense_id'])->whereNull('invoice_item_id')->update(['invoice_item_id' => $row->id]);
                }
            }

            return $this->recalculate($invoice);
        });
    }

    public function recalculate(Invoice $invoice): Invoice
    {
        $subtotal = (string) $invoice->items()->sum('amount');
        $subtotal = number_format((float) $subtotal, 2, '.', '');
        $discount = min((float) $invoice->discount, (float) $subtotal);
        $taxable = bcsub($subtotal, number_format($discount, 2, '.', ''), 2);
        $tax = bcdiv(bcmul($taxable, (string) $invoice->tax_rate, 4), '100', 2);

        $invoice->forceFill([
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax_amount' => $tax,
            'total' => bcadd($taxable, $tax, 2),
        ])->save();

        return $invoice;
    }

    public function issue(Invoice $invoice): Invoice
    {
        if ($invoice->status !== InvoiceStatus::Draft) {
            throw ValidationException::withMessages(['status' => __('Only draft invoices can be issued.')]);
        }

        if (bccomp((string) $invoice->total, '0', 2) <= 0) {
            throw ValidationException::withMessages(['items' => __('An invoice must have a positive total.')]);
        }

        return DB::transaction(function () use ($invoice): Invoice {
            $invoice->forceFill([
                'number' => $this->numbers->next($invoice->organization, 'invoice', (int) $invoice->issue_date->year),
                'status' => InvoiceStatus::Issued,
                'issued_at' => now(),
            ])->save();

            if ($invoice->legalCase) {
                $this->timeline->record($invoice->legalCase, 'invoice_issued', __('Invoice :number issued', ['number' => $invoice->number]), null, $invoice);
            }

            return $invoice;
        });
    }

    public function void(Invoice $invoice, string $reason): Invoice
    {
        if (in_array($invoice->status, [InvoiceStatus::Void, InvoiceStatus::Draft], true)) {
            throw ValidationException::withMessages(['status' => __('This invoice cannot be voided.')]);
        }

        if (bccomp((string) $invoice->amount_paid, '0', 2) > 0) {
            throw ValidationException::withMessages(['reason' => __('Refund all payments before voiding this invoice.')]);
        }

        $invoice->forceFill(['status' => InvoiceStatus::Void, 'void_reason' => $reason, 'voided_at' => now()])->save();
        CaseExpense::query()->whereIn('invoice_item_id', $invoice->items()->select('id'))->update(['invoice_item_id' => null]);

        return $invoice;
    }

    /** Recomputes amount_paid from confirmed payments minus refunds and updates status. */
    public function syncPaidAmount(Invoice $invoice): Invoice
    {
        $paid = (string) $invoice->payments()->where('status', 'confirmed')->sum('amount');
        $refunded = (string) DB::table('refunds')->whereIn('payment_id', $invoice->payments()->select('id'))->sum('amount');
        $net = bcsub(number_format((float) $paid, 2, '.', ''), number_format((float) $refunded, 2, '.', ''), 2);

        $status = match (true) {
            $invoice->status === InvoiceStatus::Void => InvoiceStatus::Void,
            bccomp($net, (string) $invoice->total, 2) >= 0 => InvoiceStatus::Paid,
            bccomp($net, '0', 2) > 0 => InvoiceStatus::PartiallyPaid,
            default => InvoiceStatus::Issued,
        };

        $invoice->forceFill(['amount_paid' => $net, 'status' => $status])->save();

        return $invoice;
    }
}
