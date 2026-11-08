<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\InvoiceRequest;
use App\Models\CaseExpense;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\Payment;
use App\Services\Finance\InvoiceService;
use App\Services\Finance\PaymentService;
use App\Services\Pdf\PdfRenderer;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Invoice::class);
        $organization = $this->organization();
        [$sort, $direction] = $this->sorting(['number', 'issue_date', 'due_date', 'total'], 'issue_date');

        $invoices = $this->filtered($request)->with(['client:id,name', 'legalCase:id,reference'])
            ->orderBy($sort, $direction)->orderByDesc('id')->paginate(25)->withQueryString()
            ->through(fn (Invoice $i) => self::present($i));

        $open = Invoice::query()->forOrganization($organization)->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value]);

        return Inertia::render('Workspace/Invoices/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'status', 'client_id', 'sort', 'direction']),
            'summary' => [
                'outstanding' => (float) (clone $open)->sum(DB::raw('total - amount_paid')),
                'overdue' => (float) (clone $open)->whereDate('due_date', '<', today())->sum(DB::raw('total - amount_paid')),
                'collected_month' => (float) Payment::query()->forOrganization($organization)->where('status', 'confirmed')->whereBetween('paid_on', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'),
            ],
            'options' => ['statuses' => InvoiceStatus::options(), 'clients' => ReferenceOptions::clients($organization)],
            'can' => ['create' => $request->user()->can('create', Invoice::class), 'export' => $request->user()->can('export', Invoice::class)],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Invoice::class);

        return Inertia::render('Workspace/Invoices/Form', [
            'invoice' => null,
            'preset' => ['client_id' => $request->integer('client_id') ?: null, 'legal_case_id' => $request->integer('case_id') ?: null],
            ...$this->formOptions(),
        ]);
    }

    public function store(InvoiceRequest $request, InvoiceService $invoices): RedirectResponse
    {
        $this->authorize('create', Invoice::class);
        $invoice = $invoices->saveDraft($this->organization(), $request->user(), $request->validated());

        return redirect()->route('invoices.show', $invoice)->with('success', __('Draft invoice saved.'));
    }

    public function show(Request $request, Invoice $invoice): Response
    {
        $this->authorize('view', $invoice);
        $invoice->load(['client:id,name,phone,email,address', 'legalCase:id,title,reference', 'items', 'payments.refunds', 'payments.receiver:id,name', 'creator:id,name']);
        $user = $request->user();

        return Inertia::render('Workspace/Invoices/Show', [
            'invoice' => [
                ...self::present($invoice),
                ...$invoice->only(['subtotal', 'discount', 'tax_rate', 'tax_amount', 'notes', 'void_reason']),
                'client' => $invoice->client->only(['id', 'name', 'phone', 'email', 'address']),
                'case' => $invoice->legalCase?->only(['id', 'title', 'reference']),
                'items' => $invoice->items->map->only(['id', 'type', 'description', 'quantity', 'unit_price', 'amount']),
                'payments' => $invoice->payments->map(fn (Payment $p) => [
                    'id' => $p->id, 'receipt_number' => $p->receipt_number, 'amount' => $p->amount, 'method' => $p->method->label(), 'reference' => $p->reference,
                    'paid_on' => $p->paid_on->toDateString(), 'received_by' => $p->receiver?->name, 'refunded' => $p->refunds->sum('amount'),
                    'refunds' => $p->refunds->map(fn ($r) => ['amount' => $r->amount, 'reason' => $r->reason, 'refunded_on' => $r->refunded_on->toDateString()]),
                ]),
                'created_by' => $invoice->creator->name,
            ],
            'methods' => collect(PaymentMethod::options())->reject(fn ($m) => $m['value'] === 'online')->values(),
            'can' => [
                'edit' => $user->can('update', $invoice) && $invoice->isEditable(),
                'issue' => $user->can('update', $invoice) && $invoice->status === InvoiceStatus::Draft,
                'void' => $user->can('update', $invoice) && ! in_array($invoice->status, [InvoiceStatus::Void, InvoiceStatus::Draft], true),
                'pay' => $user->can('recordPayment', $invoice) && in_array($invoice->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true),
                'refund' => $user->can('refund', $invoice),
            ],
        ]);
    }

    public function edit(Invoice $invoice): Response|RedirectResponse
    {
        $this->authorize('update', $invoice);
        if (! $invoice->isEditable()) {
            return redirect()->route('invoices.show', $invoice)->with('error', __('Issued invoices cannot be edited.'));
        }
        $invoice->load('items');

        return Inertia::render('Workspace/Invoices/Form', [
            'invoice' => [
                ...$invoice->only(['id', 'client_id', 'legal_case_id', 'discount', 'tax_rate', 'notes']),
                'issue_date' => $invoice->issue_date->toDateString(), 'due_date' => $invoice->due_date?->toDateString(),
                'items' => $invoice->items->map(fn ($i) => [...$i->only(['type', 'description', 'quantity', 'unit_price']), 'expense_id' => CaseExpense::query()->where('invoice_item_id', $i->id)->value('id')]),
            ],
            'preset' => null,
            ...$this->formOptions(),
        ]);
    }

    public function update(InvoiceRequest $request, Invoice $invoice, InvoiceService $invoices): RedirectResponse
    {
        $this->authorize('update', $invoice);
        $invoices->saveDraft($this->organization(), $request->user(), $request->validated(), $invoice);

        return redirect()->route('invoices.show', $invoice)->with('success', __('Draft updated.'));
    }

    public function issue(Invoice $invoice, InvoiceService $invoices): RedirectResponse
    {
        $this->authorize('update', $invoice);
        $invoices->issue($invoice);

        return back()->with('success', __('Invoice :number issued.', ['number' => $invoice->number]));
    }

    public function void(Request $request, Invoice $invoice, InvoiceService $invoices): RedirectResponse
    {
        $this->authorize('update', $invoice);
        $invoices->void($invoice, $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']])['reason']);

        return back()->with('success', __('Invoice voided.'));
    }

    public function recordPayment(Request $request, Invoice $invoice, PaymentService $payments): RedirectResponse
    {
        $this->authorize('recordPayment', $invoice);
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'method' => ['required', Rule::enum(PaymentMethod::class), Rule::notIn([PaymentMethod::Online->value])],
            'reference' => ['nullable', 'required_if:method,bank_transfer,cheque', 'string', 'max:100'],
            'paid_on' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'string', 'size:36'],
        ]);
        $validated['amount'] = number_format((float) $validated['amount'], 2, '.', '');

        $payment = $payments->recordManual($invoice, $request->user(), $validated);

        return back()->with('success', __('Payment recorded — receipt :number.', ['number' => $payment->receipt_number]));
    }

    public function refund(Request $request, Payment $payment, PaymentService $payments): RedirectResponse
    {
        $this->authorize('refund', $payment->invoice);
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
            'refunded_on' => ['required', 'date', 'before_or_equal:today'],
        ]);

        $payments->refund($payment, $request->user(), number_format((float) $validated['amount'], 2, '.', ''), $validated['reason'], $validated['refunded_on']);

        return back()->with('success', __('Refund recorded.'));
    }

    public function pdf(Request $request, Invoice $invoice, PdfRenderer $pdf): HttpResponse
    {
        $this->authorize('view', $invoice);
        $invoice->load(['organization', 'client', 'legalCase', 'items', 'payments']);

        return $pdf->download('pdf.invoice', ['invoice' => $invoice, 'title' => $invoice->number], $invoice->number.'.pdf', $request->boolean('inline'));
    }

    public function receipt(Request $request, Payment $payment, PdfRenderer $pdf): HttpResponse
    {
        $this->authorize('view', $payment->invoice);
        $payment->load(['organization', 'client', 'invoice.legalCase', 'receiver', 'refunds']);

        return $pdf->download('pdf.receipt', ['payment' => $payment, 'title' => $payment->receipt_number], $payment->receipt_number.'.pdf', $request->boolean('inline'));
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('export', Invoice::class);
        activity('exports')->causedBy($request->user())->withProperties($request->only(['status', 'client_id', 'search']))->log('invoices_csv');

        return response()->streamDownload(function () use ($request): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Number', 'Issue date', 'Due date', 'Client', 'Case', 'Status', 'Total', 'Paid', 'Balance']);
            $this->filtered($request)->with(['client:id,name', 'legalCase:id,reference'])->orderBy('issue_date')->chunk(500, function ($rows) use ($out): void {
                foreach ($rows as $i) {
                    fputcsv($out, [$i->number, $i->issue_date->toDateString(), $i->due_date?->toDateString(), self::csvSafe($i->client->name), $i->legalCase?->reference, $i->status->value, $i->total, $i->amount_paid, $i->balance()]);
                }
            });
            fclose($out);
        }, 'invoices-'.now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** Prevents CSV formula injection when opened in spreadsheet software. */
    public static function csvSafe(?string $value): ?string
    {
        return $value !== null && preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }

    private function filtered(Request $request)
    {
        return Invoice::query()->forOrganization($this->organization())
            ->when($request->string('status')->toString(), fn ($q, $s) => $s === 'overdue'
                ? $q->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->whereDate('due_date', '<', today())
                : $q->where('status', $s))
            ->when($request->integer('client_id'), fn ($q, $id) => $q->where('client_id', $id))
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where(fn ($w) => $w->where('number', 'like', "%{$s}%")->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$s}%"))));
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        $organization = $this->organization();

        return ['options' => [
            'clients' => ReferenceOptions::clients($organization),
            'cases' => LegalCase::query()->forOrganization($organization)->with('clients:id')->orderBy('title')->limit(1000)->get(['id', 'title', 'reference', 'professional_fee'])
                ->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title, 'client_ids' => $c->clients->pluck('id'), 'fee' => $c->professional_fee]),
            'expenses' => CaseExpense::query()->forOrganization($organization)->where('is_billable', true)->whereNull('invoice_item_id')->get(['id', 'legal_case_id', 'description', 'amount'])
                ->map(fn ($e) => ['id' => $e->id, 'legal_case_id' => $e->legal_case_id, 'description' => $e->description, 'amount' => $e->amount]),
        ]];
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(Invoice $i): array
    {
        return [
            'id' => $i->id, 'number' => $i->number, 'status' => $i->status->value, 'status_label' => $i->status->label(),
            'issue_date' => $i->issue_date->toDateString(), 'due_date' => $i->due_date?->toDateString(),
            'total' => $i->total, 'amount_paid' => $i->amount_paid, 'balance' => $i->balance(),
            'overdue' => $i->due_date && $i->due_date->isPast() && in_array($i->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true),
            'client' => $i->relationLoaded('client') ? $i->client?->name : null,
            'case_reference' => $i->relationLoaded('legalCase') ? $i->legalCase?->reference : null,
        ];
    }
}
