<?php

namespace App\Http\Controllers\Portal;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Enums\DocumentCategory;
use App\Enums\HearingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Document;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Payment;
use App\Models\Review;
use App\Services\Appointments\AppointmentService;
use App\Services\Cases\Timeline;
use App\Services\Documents\DocumentVault;
use App\Services\Pdf\PdfRenderer;
use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Client portal (docs/Modules/Clients.md#client-portal). Everything is scoped
 * to the signed-in user's client records and to what lawyers chose to share:
 * client-visible hearings and timeline events, shared documents, issued invoices.
 * Internal notes, strategy and confidential documents are never selected.
 */
class PortalController extends Controller
{
    /** @return Builder<LegalCase> */
    private function cases(Request $request): Builder
    {
        return LegalCase::query()->sharedWithClientUser($request->user());
    }

    /** @return Builder<Hearing> */
    private function hearings(Request $request): Builder
    {
        return Hearing::query()->where('visible_to_client', true)->whereIn('legal_case_id', $this->cases($request)->select('legal_cases.id'));
    }

    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Portal/Dashboard', [
            'stats' => [
                'cases' => $this->cases($request)->count(),
                'upcoming' => $this->hearings($request)->where('status', HearingStatus::Scheduled->value)->whereDate('hearing_date', '>=', today())->count(),
                'documents' => $this->sharedDocuments($request)->count(),
                'due' => (float) Invoice::query()->whereIn('client_id', Client::query()->where('user_id', $user->id)->select('id'))->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->get()->sum(fn ($i) => (float) $i->balance()),
            ],
            'nextHearings' => $this->hearings($request)->where('status', HearingStatus::Scheduled->value)->whereDate('hearing_date', '>=', today())
                ->with(['legalCase:id,title', 'court:id,name'])->orderBy('hearing_date')->orderBy('hearing_time')->limit(5)->get()->map(fn ($h) => $this->hearing($h)),
            'appointments' => Appointment::query()->where('requested_by', $user->id)->where('starts_at', '>=', now())->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value])
                ->with(['lawyer:id,name,avatar_path', 'rescheduledFrom:id,starts_at'])->orderBy('starts_at')->limit(5)->get()->map(fn ($a) => $this->appointment($a)),
            'lawyers' => $this->cases($request)->with('lawyers:id,name', 'lawyers.lawyerProfile:id,user_id,slug')->get()->flatMap->lawyers->unique('id')->values()
                ->map(fn ($l) => ['name' => $l->name, 'slug' => $l->lawyerProfile?->slug]),
        ]);
    }

    public function listCases(Request $request): Response
    {
        return Inertia::render('Portal/Cases/Index', [
            'cases' => $this->cases($request)->with(['court:id,name', 'organization:id,name', 'lawyers:id,name', 'nextHearing'])->latest('updated_at')->get()->map(fn (LegalCase $c) => [
                'id' => $c->id, 'title' => $c->title, 'case_number' => $c->case_number, 'status' => $c->status->value, 'status_label' => $c->status->label(),
                'court' => $c->court?->name, 'organization' => $c->organization->name, 'lawyers' => $c->lawyers->pluck('name'),
                'next_hearing_at' => $c->nextHearing?->visible_to_client ? $c->next_hearing_at?->toIso8601String() : null,
            ]),
        ]);
    }

    public function showCase(Request $request, LegalCase $case): Response
    {
        $this->authorize('viewAsClient', $case);
        $case->load(['court:id,name', 'organization:id,name', 'lawyers:id,name', 'lawyers.lawyerProfile:id,user_id,slug']);

        return Inertia::render('Portal/Cases/Show', [
            'legalCase' => [
                'id' => $case->id, 'title' => $case->title, 'case_number' => $case->case_number, 'case_type' => $case->case_type->label(),
                'status' => $case->status->value, 'status_label' => $case->status->label(), 'stage' => $case->stage, 'court' => $case->court?->name,
                'organization' => $case->organization->name, 'summary' => $case->client_summary, 'filing_date' => $case->filing_date?->toDateString(),
                'lawyers' => $case->lawyers->map(fn ($l) => ['id' => $l->id, 'name' => $l->name, 'slug' => $l->lawyerProfile?->slug]),
                'client_id' => $case->clients()->where('clients.user_id', $request->user()->id)->value('clients.id'),
            ],
            'hearings' => $case->hearings()->where('visible_to_client', true)->whereNotIn('status', [HearingStatus::Rescheduled->value])
                ->with('court:id,name')->orderByDesc('hearing_date')->get()->map(fn ($h) => $this->hearing($h)),
            'timeline' => $case->events()->where('visible_to_client', true)->orderByDesc('occurred_at')->limit(100)->get(['id', 'title', 'description', 'occurred_at'])
                ->map(fn ($e) => ['id' => $e->id, 'title' => $e->title, 'description' => $e->description, 'occurred_at' => $e->occurred_at->toIso8601String()]),
            'documents' => $this->sharedDocuments($request)->where('legal_case_id', $case->id)->get()->map(fn ($d) => $this->document($d)),
        ]);
    }

    public function documents(Request $request): Response
    {
        return Inertia::render('Portal/Documents', [
            'documents' => $this->sharedDocuments($request)->with('legalCase:id,title')->get()->map(fn ($d) => [...$this->document($d), 'case' => $d->legalCase?->title]),
            'cases' => $this->cases($request)->get(['legal_cases.id', 'title'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->title]),
        ]);
    }

    public function download(Request $request, Document $document, DocumentVault $vault): StreamedResponse
    {
        $this->authorize('viewAsClient', $document);
        $share = $document->activeShares()->whereHas('client', fn ($q) => $q->where('user_id', $request->user()->id))->first();
        abort_if($share && ! $share->can_download && ! $request->boolean('inline'), 403);

        return $vault->stream($document, null, $request->user(), $request->boolean('inline'));
    }

    /** Clients may upload documents to a shared case; they land in the vault flagged as client-sourced. */
    public function upload(Request $request, DocumentVault $vault, Timeline $timeline): RedirectResponse
    {
        $validated = $request->validate([
            'legal_case_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,docx', 'max:10240'],
        ]);
        $case = $this->cases($request)->findOrFail($validated['legal_case_id']);
        $client = $case->clients()->where('clients.user_id', $request->user()->id)->firstOrFail();

        $document = $vault->store($case->organization, $request->user(), $request->file('file'), [
            'title' => $validated['title'], 'category' => DocumentCategory::Other->value, 'legal_case_id' => $case->id,
            'client_id' => $client->id, 'source' => 'client', 'is_confidential' => false,
        ]);
        $timeline->record($case, 'client_upload', __('Client uploaded: :title', ['title' => $document->title]), null, $document, true);

        return back()->with('success', __('Document sent to your lawyer.'));
    }

    public function invoices(Request $request): Response
    {
        return Inertia::render('Portal/Invoices/Index', [
            'invoices' => $this->clientInvoices($request)->with(['organization:id,name', 'legalCase:id,title'])->latest('issue_date')->get()->map(fn (Invoice $i) => [
                'id' => $i->id, 'number' => $i->number, 'issue_date' => $i->issue_date->toDateString(), 'due_date' => $i->due_date?->toDateString(),
                'total' => $i->total, 'amount_paid' => $i->amount_paid, 'balance' => $i->balance(), 'status' => $i->status->value, 'status_label' => $i->status->label(),
                'organization' => $i->organization->name, 'case' => $i->legalCase?->title,
            ]),
        ]);
    }

    public function showInvoice(Request $request, Invoice $invoice): Response
    {
        $this->authorize('viewAsClient', $invoice);
        $invoice->load(['organization:id,name,address,phone', 'legalCase:id,title', 'items', 'payments']);

        return Inertia::render('Portal/Invoices/Show', [
            'invoice' => [
                ...$invoice->only(['id', 'number', 'subtotal', 'discount', 'tax_rate', 'tax_amount', 'total', 'amount_paid', 'notes']),
                'balance' => $invoice->balance(), 'status' => $invoice->status->value, 'status_label' => $invoice->status->label(),
                'issue_date' => $invoice->issue_date->toDateString(), 'due_date' => $invoice->due_date?->toDateString(),
                'organization' => $invoice->organization->only(['name', 'address', 'phone']), 'case' => $invoice->legalCase?->title,
                'items' => $invoice->items->map->only(['description', 'quantity', 'unit_price', 'amount']),
                'payments' => $invoice->payments->where('status', 'confirmed')->values()->map(fn (Payment $p) => ['id' => $p->id, 'receipt_number' => $p->receipt_number, 'amount' => $p->amount, 'paid_on' => $p->paid_on->toDateString(), 'method' => $p->method->label()]),
            ],
        ]);
    }

    public function invoicePdf(Request $request, Invoice $invoice, PdfRenderer $pdf): HttpResponse
    {
        $this->authorize('viewAsClient', $invoice);
        $invoice->load(['organization', 'client', 'legalCase', 'items', 'payments']);

        return $pdf->download('pdf.invoice', ['invoice' => $invoice, 'title' => $invoice->number], $invoice->number.'.pdf');
    }

    public function receipt(Request $request, Payment $payment, PdfRenderer $pdf): HttpResponse
    {
        $this->authorize('viewAsClient', $payment->invoice);
        $payment->load(['organization', 'client', 'invoice.legalCase', 'receiver', 'refunds']);

        return $pdf->download('pdf.receipt', ['payment' => $payment, 'title' => $payment->receipt_number], $payment->receipt_number.'.pdf');
    }

    public function appointments(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Portal/Appointments', [
            'appointments' => Appointment::query()->where(fn ($q) => $q->where('requested_by', $user->id)->orWhereIn('client_id', Client::query()->where('user_id', $user->id)->select('id')))
                ->with(['lawyer:id,name,avatar_path', 'rescheduledFrom:id,starts_at'])->latest('starts_at')->limit(100)->get()->map(fn ($a) => $this->appointment($a)),
        ]);
    }

    public function book(Request $request, LawyerProfile $lawyer, AppointmentService $service): Response
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $lawyer->load('user:id,name');

        return Inertia::render('Portal/Book', [
            'lawyer' => ['slug' => $lawyer->slug, 'name' => $lawyer->user->name, 'fee' => $lawyer->consultation_fee_min, 'offers_online' => $lawyer->offers_online, 'offers_in_person' => $lawyer->offers_in_person, 'accepting' => $lawyer->accepting_clients],
            'slots' => $service->availableSlots($lawyer->user, today(), 14)->values(),
            'modes' => collect(AppointmentMode::options())->filter(fn ($m) => ($m['value'] === 'online' && $lawyer->offers_online) || ($m['value'] === 'in_person' && $lawyer->offers_in_person))->values(),
        ]);
    }

    public function storeBooking(Request $request, LawyerProfile $lawyer, AppointmentService $service): RedirectResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $validated = $request->validate([
            'starts_at' => ['required', 'date', 'after:now'],
            'mode' => ['required', Rule::enum(AppointmentMode::class)],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $service->request($request->user(), $lawyer, Carbon::parse($validated['starts_at']), AppointmentMode::from($validated['mode']), $validated['message'] ?? null);

        return redirect()->route('portal.appointments.index')->with('success', __('Request sent. You will be notified when the lawyer confirms.'));
    }

    public function cancelAppointment(Request $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manageAsClient', $appointment);
        $service->transition($appointment, AppointmentStatus::Cancelled, $request->validate(['reason' => ['required', 'string', 'max:255']])['reason'], $request->user());

        return back()->with('success', __('Appointment cancelled.'));
    }

    /** Free slots of this appointment's lawyer, for "Request a new time" (AJAX). */
    public function appointmentSlots(Request $request, Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manageAsClient', $appointment);

        return response()->json(['slots' => $service->availableSlots($appointment->lawyer, today(), 14)->values()]);
    }

    /** Client asks for a new time; the lawyer must accept it (status becomes requested). */
    public function rescheduleAppointment(Request $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manageAsClient', $appointment);
        $validated = $request->validate(['starts_at' => ['required', 'date', 'after:now'], 'reason' => ['nullable', 'string', 'max:255']]);
        $service->reschedule($appointment, Carbon::parse($validated['starts_at']), $request->user(), $validated['reason'] ?? null);

        return back()->with('success', __('New time requested. The lawyer will confirm it.'));
    }

    public function favourites(Request $request): Response
    {
        return Inertia::render('Portal/Favourites', [
            'lawyers' => $request->user()->favouriteLawyers()->listed()->with(['user:id,name', 'city:id,name'])->get()
                ->map(fn ($p) => ['slug' => $p->slug, 'name' => $p->user->name, 'headline' => $p->headline, 'city' => $p->city?->name, 'verified' => $p->isVerified(), 'photo_url' => PublicFile::url($p->photo_path)]),
        ]);
    }

    /**
     * Reviews are allowed only from clients with a completed appointment or a
     * case with the lawyer; one review per lawyer; published after moderation.
     */
    public function review(Request $request, LawyerProfile $lawyer): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'comment' => ['required', 'string', 'min:20', 'max:3000'],
        ]);

        $appointment = Appointment::query()->where('lawyer_id', $lawyer->user_id)->where('status', AppointmentStatus::Completed->value)
            ->where(fn ($q) => $q->where('requested_by', $user->id)->orWhereIn('client_id', Client::query()->where('user_id', $user->id)->select('id')))->first();
        $case = $this->cases($request)->whereHas('lawyers', fn ($q) => $q->whereKey($lawyer->user_id))->first();

        if (! $appointment && ! $case) {
            return back()->with('error', __('You can review a lawyer after a completed consultation or case with them.'));
        }

        if (Review::query()->where('lawyer_profile_id', $lawyer->id)->where('user_id', $user->id)->exists()) {
            return back()->with('error', __('You have already reviewed this lawyer.'));
        }

        Review::create([...$validated, 'lawyer_profile_id' => $lawyer->id, 'user_id' => $user->id, 'appointment_id' => $appointment?->id, 'legal_case_id' => $case?->id, 'status' => ReviewStatus::Pending]);

        return back()->with('success', __('Thank you. Your review will appear after moderation.'));
    }

    /** @return Builder<Document> */
    private function sharedDocuments(Request $request): Builder
    {
        $user = $request->user();

        return Document::query()->with('currentVersion')
            ->where(fn ($q) => $q->whereHas('activeShares.client', fn ($c) => $c->where('user_id', $user->id))
                ->orWhere(fn ($w) => $w->where('source', 'client')->where('uploaded_by', $user->id)))
            ->where('is_confidential', false)->latest('updated_at');
    }

    /** @return Builder<Invoice> */
    private function clientInvoices(Request $request): Builder
    {
        return Invoice::query()->whereIn('client_id', Client::query()->where('user_id', $request->user()->id)->select('id'))->where('status', '!=', InvoiceStatus::Draft->value);
    }

    /** @return array<string, mixed> */
    private function hearing(Hearing $h): array
    {
        return [
            'id' => $h->id, 'hearing_date' => $h->hearing_date->toDateString(), 'hearing_time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : null,
            'status' => $h->status->value, 'status_label' => $h->status->label(), 'purpose' => $h->purpose, 'court' => $h->court?->name,
            'case' => $h->relationLoaded('legalCase') ? $h->legalCase?->only(['id', 'title']) : null,
            'client_note' => $h->client_note, 'order_passed' => $h->order_passed, 'next_hearing_date' => $h->next_hearing_date?->toDateString(),
        ];
    }

    /** @return array<string, mixed> */
    private function document(Document $d): array
    {
        return ['id' => $d->id, 'title' => $d->title, 'category' => $d->category->label(), 'mime' => $d->currentVersion?->mime, 'size' => $d->currentVersion?->size, 'source' => $d->source, 'updated_at' => $d->updated_at->toIso8601String()];
    }

    /** @return array<string, mixed> */
    private function appointment(Appointment $a): array
    {
        return [
            'id' => $a->id, 'starts_at' => $a->starts_at->toIso8601String(), 'status' => $a->status->value, 'status_label' => $a->status->label(),
            'mode' => $a->mode->label(), 'lawyer' => $a->lawyer->name, 'meeting_link' => $a->status === AppointmentStatus::Confirmed ? $a->meeting_link : null,
            'cancellable' => in_array($a->status, [AppointmentStatus::Requested, AppointmentStatus::Confirmed], true) && $a->starts_at->isFuture(),
            'reschedulable' => in_array($a->status, [AppointmentStatus::Requested, AppointmentStatus::Confirmed], true) && $a->starts_at->isFuture(),
            'mode_value' => $a->mode->value,
            'lawyer_avatar' => PublicFile::url($a->lawyer->avatar_path),
            'ends_at' => $a->ends_at->toIso8601String(),
            'cancellation_reason' => $a->status === AppointmentStatus::Cancelled || $a->status === AppointmentStatus::Declined ? $a->cancellation_reason : null,
            'rescheduled_from' => $a->rescheduled_from_id ? $a->rescheduledFrom?->starts_at?->toIso8601String() : null,
        ];
    }
}
