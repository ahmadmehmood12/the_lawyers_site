<?php

namespace Tests\Feature\Workflows;

use App\Http\Controllers\Workspace\InvoiceController;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use LogicException;
use Tests\TestCase;

class FinanceTest extends TestCase
{
    use RefreshDatabase;

    private User $lawyer;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->lawyer = $this->lawyer();
        $this->client = Client::factory()->create(['organization_id' => $this->org($this->lawyer)->id]);
        $this->actingAs($this->lawyer);
    }

    private function draft(): Invoice
    {
        $this->post(route('invoices.store'), [
            'client_id' => $this->client->id, 'issue_date' => today()->toDateString(), 'discount' => 1000, 'tax_rate' => 0,
            'items' => [['type' => 'fee', 'description' => 'Professional fee', 'quantity' => 1, 'unit_price' => 50000], ['type' => 'expense', 'description' => 'Court fee', 'quantity' => 2, 'unit_price' => 500]],
        ])->assertSessionHasNoErrors();

        return Invoice::query()->latest('id')->firstOrFail();
    }

    private function pay(Invoice $invoice, string $amount, ?string $key = null)
    {
        return $this->post(route('invoices.payments.store', $invoice), ['amount' => $amount, 'method' => 'cash', 'paid_on' => today()->toDateString(), 'idempotency_key' => $key ?? (string) Str::uuid()]);
    }

    public function test_totals_are_computed_server_side(): void
    {
        $invoice = $this->draft();

        $this->assertSame('51000.00', (string) $invoice->subtotal);
        $this->assertSame('50000.00', (string) $invoice->total);
        $this->assertStringStartsWith('DRAFT-', $invoice->number);
    }

    public function test_issue_assigns_sequential_numbers_and_locks_editing(): void
    {
        $first = $this->draft();
        $second = $this->draft();
        $this->post(route('invoices.issue', $first));
        $this->post(route('invoices.issue', $second));

        $year = now()->year;
        $this->assertSame("INV-{$year}-0001", $first->fresh()->number);
        $this->assertSame("INV-{$year}-0002", $second->fresh()->number);
        $this->put(route('invoices.update', $first), ['client_id' => $this->client->id, 'issue_date' => today()->toDateString(), 'items' => [['type' => 'fee', 'description' => 'x', 'quantity' => 1, 'unit_price' => 1]]])->assertSessionHasErrors('items');
    }

    public function test_partial_then_full_payment_and_overpayment_rejected(): void
    {
        $invoice = $this->draft();
        $this->post(route('invoices.issue', $invoice));

        $this->pay($invoice, '20000')->assertSessionHasNoErrors();
        $this->assertSame('partially_paid', $invoice->fresh()->status->value);
        $this->pay($invoice, '30001')->assertSessionHasErrors('amount');
        $this->pay($invoice, '30000')->assertSessionHasNoErrors();
        $this->assertSame('paid', $invoice->fresh()->status->value);
        $this->assertSame(2, $invoice->payments()->count());
        $this->assertSame('RCT-'.now()->year.'-0002', $invoice->payments()->reorder()->latest('id')->value('receipt_number'));
    }

    public function test_duplicate_submission_is_idempotent(): void
    {
        $invoice = $this->draft();
        $this->post(route('invoices.issue', $invoice));
        $key = (string) Str::uuid();

        $this->pay($invoice, '10000', $key);
        $this->pay($invoice, '10000', $key);

        $this->assertSame(1, $invoice->payments()->count());
    }

    public function test_payments_are_immutable_and_refunds_reduce_paid_amount(): void
    {
        $invoice = $this->draft();
        $this->post(route('invoices.issue', $invoice));
        $this->pay($invoice, '50000');
        $payment = Payment::query()->sole();

        $this->assertThrows(fn () => $payment->update(['amount' => 1]), LogicException::class);
        $this->assertThrows(fn () => $payment->delete(), LogicException::class);

        $this->post(route('payments.refunds.store', $payment), ['amount' => 60000, 'reason' => 'Too much', 'refunded_on' => today()->toDateString()])->assertSessionHasErrors('amount');
        $this->post(route('payments.refunds.store', $payment), ['amount' => 5000, 'reason' => 'Fee reduced', 'refunded_on' => today()->toDateString()])->assertSessionHasNoErrors();
        $this->assertSame('45000.00', (string) $invoice->fresh()->amount_paid);
        $this->assertSame('partially_paid', $invoice->fresh()->status->value);
    }

    public function test_receipt_and_invoice_pdfs_render(): void
    {
        $invoice = $this->draft();
        $this->post(route('invoices.issue', $invoice));
        $this->pay($invoice, '50000');

        $this->get(route('invoices.pdf', $invoice))->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->get(route('payments.receipt', Payment::query()->sole()))->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_client_sees_own_issued_invoice_only(): void
    {
        $invoice = $this->draft();
        [$clientUser] = [User::factory()->client()->create()];
        $this->client->update(['user_id' => $clientUser->id]);
        $other = User::factory()->client()->create();

        $this->actingAs($clientUser)->get(route('portal.invoices.show', $invoice))->assertNotFound(); // still draft
        $this->actingAs($this->lawyer)->post(route('invoices.issue', $invoice));
        $this->actingAs($clientUser)->get(route('portal.invoices.show', $invoice))->assertOk();
        $this->actingAs($other)->get(route('portal.invoices.show', $invoice))->assertNotFound();
    }

    public function test_payment_webhook_requires_valid_signature(): void
    {
        config(['services.payments.gateway' => 'testpsp', 'services.payments.webhook_secret' => 'whsec']);
        $invoice = $this->draft();
        $this->post(route('invoices.issue', $invoice));
        $body = json_encode(['invoice_id' => $invoice->id, 'amount' => 50000, 'provider_reference' => 'TX-1', 'status' => 'paid']);

        $this->call('POST', '/api/webhooks/payments/testpsp', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => 'bad'], $body)->assertUnauthorized();
        $this->assertSame(0, Payment::query()->count());

        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => hash_hmac('sha256', $body, 'whsec')];
        $this->call('POST', '/api/webhooks/payments/testpsp', [], [], [], $headers, $body)->assertOk();
        $this->call('POST', '/api/webhooks/payments/testpsp', [], [], [], $headers, $body)->assertOk();
        $this->assertSame(1, Payment::query()->count());
        $this->assertSame('paid', $invoice->fresh()->status->value);
    }

    public function test_csv_export_neutralises_formulas(): void
    {
        $this->assertSame("'=HYPERLINK()", InvoiceController::csvSafe('=HYPERLINK()'));
        $this->get(route('invoices.export'))->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
