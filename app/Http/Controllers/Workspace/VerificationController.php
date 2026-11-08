<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\VerificationDocument;
use App\Services\Verification\VerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Lawyer-side verification: upload evidence, submit, track history. */
class VerificationController extends Controller
{
    public function show(Request $request, VerificationService $service): Response
    {
        abort_unless($request->user()->isLawyer() && $request->user()->lawyerProfile, 403);
        $profile = $request->user()->lawyerProfile;
        $verification = $service->currentRequest($profile)->load(['documents', 'events.actor:id,name']);

        return Inertia::render('Workspace/Profile/Verification', [
            'verification' => [
                'id' => $verification->id,
                'status' => $verification->status->value,
                'status_label' => $verification->status->label(),
                'editable' => $verification->isEditableByLawyer(),
                'submitted_at' => $verification->submitted_at?->toIso8601String(),
                'information_requested' => $verification->information_requested,
                'reviewer_notes' => in_array($verification->status->value, ['rejected', 'information_requested'], true) ? $verification->reviewer_notes : null,
                'documents' => $verification->documents->map(fn ($d) => ['id' => $d->id, 'type' => $d->type, 'original_name' => $d->original_name, 'size' => $d->size, 'created_at' => $d->created_at->toIso8601String()]),
                'events' => $verification->events->map(fn ($e) => ['id' => $e->id, 'to' => $e->to_status, 'note' => $e->note, 'actor' => $e->actor?->isPlatformStaff() ? __('Verification team') : $e->actor?->name, 'created_at' => $e->created_at->toIso8601String()]),
            ],
            'profileComplete' => (bool) ($profile->bar_council_id && $profile->enrollment_number && $profile->advocate_category),
            'documentTypes' => VerificationService::DOCUMENT_TYPES,
        ]);
    }

    public function upload(Request $request, VerificationService $service): RedirectResponse
    {
        $profile = $request->user()->lawyerProfile;
        abort_unless($profile, 403);
        $validated = $request->validate([
            'type' => ['required', Rule::in(VerificationService::DOCUMENT_TYPES)],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $service->addDocument($service->currentRequest($profile), $validated['type'], $request->file('file'));

        return back()->with('success', __('Document uploaded.'));
    }

    public function destroyDocument(Request $request, VerificationDocument $document): RedirectResponse
    {
        $verification = $document->request;
        abort_unless($verification->lawyer_profile_id === $request->user()->lawyerProfile?->id, 404);
        abort_unless($verification->isEditableByLawyer(), 422);

        Storage::disk($document->disk)->delete($document->path);
        $document->delete();

        return back()->with('success', __('Document removed.'));
    }

    public function download(Request $request, VerificationDocument $document): StreamedResponse
    {
        abort_unless($document->request->lawyer_profile_id === $request->user()->lawyerProfile?->id, 404);

        return Storage::disk($document->disk)->download($document->path, $document->original_name, ['Cache-Control' => 'private, no-store']);
    }

    public function submit(Request $request, VerificationService $service): RedirectResponse
    {
        $profile = $request->user()->lawyerProfile;
        abort_unless($profile, 403);
        $service->submit($service->currentRequest($profile), $request->user());

        return back()->with('success', __('Submitted for verification. We will notify you of the outcome.'));
    }
}
