<?php

namespace App\Http\Controllers\Admin;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\VerificationDocument;
use App\Models\VerificationRequest;
use App\Services\Verification\VerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Verification officers review lawyer evidence (docs/Modules/Lawyer-Verification.md). */
class VerificationController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: 'queue';

        $requests = VerificationRequest::query()->with(['lawyerProfile.user:id,name,email', 'lawyerProfile.barCouncil:id,name', 'reviewer:id,name'])->withCount('documents')
            ->when($status === 'queue', fn ($q) => $q->whereIn('status', [VerificationStatus::Submitted->value, VerificationStatus::UnderReview->value]))
            ->when($status !== 'queue' && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->whereHas('lawyerProfile', fn ($p) => $p->where('enrollment_number', 'like', "%{$s}%")->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))))
            ->orderBy('submitted_at')->orderBy('id')->paginate(25)->withQueryString()
            ->through(fn (VerificationRequest $r) => [
                'id' => $r->id, 'lawyer' => $r->lawyerProfile->user->name, 'email' => $r->lawyerProfile->user->email,
                'bar_council' => $r->lawyerProfile->barCouncil?->name, 'enrollment_number' => $r->lawyerProfile->enrollment_number,
                'status' => $r->status->value, 'status_label' => $r->status->label(), 'documents' => $r->documents_count,
                'submitted_at' => $r->submitted_at?->toIso8601String(), 'reviewer' => $r->reviewer?->name,
            ]);

        return Inertia::render('Admin/Verifications/Index', ['requests' => $requests, 'filters' => ['status' => $status, 'search' => $request->query('search')], 'statuses' => VerificationStatus::options()]);
    }

    public function show(VerificationRequest $verification): Response
    {
        $verification->load(['lawyerProfile.user:id,name,email,phone', 'lawyerProfile.barCouncil:id,name', 'lawyerProfile.educations', 'lawyerProfile.city:id,name', 'documents', 'events.actor:id,name']);
        $p = $verification->lawyerProfile;

        return Inertia::render('Admin/Verifications/Show', [
            'verification' => [
                'id' => $verification->id, 'status' => $verification->status->value, 'status_label' => $verification->status->label(),
                'submitted_at' => $verification->submitted_at?->toIso8601String(), 'reviewer_notes' => $verification->reviewer_notes,
                'lawyer' => [
                    'name' => $p->user->name, 'email' => $p->user->email, 'phone' => $p->user->phone, 'slug' => $p->slug,
                    'cnic' => $p->cnic, 'bar_council' => $p->barCouncil?->name, 'enrollment_number' => $p->enrollment_number,
                    'enrollment_date' => $p->enrollment_date?->toDateString(), 'category' => $p->advocate_category?->label(),
                    'practice_since' => $p->practice_since, 'city' => $p->city?->name,
                    'educations' => $p->educations->map->only(['degree', 'institution', 'year']),
                ],
                'documents' => $verification->documents->map(fn ($d) => ['id' => $d->id, 'type' => $d->type, 'original_name' => $d->original_name, 'mime' => $d->mime, 'size' => $d->size]),
                'events' => $verification->events->map(fn ($e) => ['id' => $e->id, 'from' => $e->from_status, 'to' => $e->to_status, 'note' => $e->note, 'actor' => $e->actor?->name, 'created_at' => $e->created_at->toIso8601String()]),
            ],
            'canDecide' => request()->user()->can('verification.decide') || request()->user()->isSuperAdmin(),
        ]);
    }

    public function transition(Request $request, VerificationRequest $verification, VerificationService $service): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['under_review', 'approved', 'rejected', 'information_requested', 'suspended'])],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        $decision = $validated['status'] !== 'under_review';
        abort_if($decision && ! ($request->user()->can('verification.decide') || $request->user()->isSuperAdmin()), 403);

        $service->transition($verification, VerificationStatus::from($validated['status']), $request->user(), $validated['note'] ?? null);

        return back()->with('success', __('Verification updated.'));
    }

    public function document(Request $request, VerificationDocument $document): StreamedResponse
    {
        activity('verification')->causedBy($request->user())->performedOn($document->request->lawyerProfile)->withProperties(['document' => $document->id])->log('verification_document_viewed');

        return Storage::disk($document->disk)->response($document->path, $document->original_name, ['Content-Type' => $document->mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
