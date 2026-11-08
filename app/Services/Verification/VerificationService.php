<?php

namespace App\Services\Verification;

use App\Enums\VerificationStatus as S;
use App\Models\LawyerProfile;
use App\Models\User;
use App\Models\VerificationDocument;
use App\Models\VerificationRequest;
use App\Notifications\VerificationStatusChanged;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lawyer verification workflow (docs/Modules/Lawyer-Verification.md).
 *
 *   unverified ─submit→ submitted ─review→ under_review ─┬→ approved ─suspend→ suspended
 *        ↑                                               ├→ rejected ─(resubmit)→ submitted
 *        └────────────── information_requested ←─────────┘
 *
 * Every transition is recorded in verification_events. "Approved" means a
 * verification officer checked the evidence — uploads alone never verify.
 */
class VerificationService
{
    public const DOCUMENT_TYPES = ['cnic_front', 'cnic_back', 'bar_license', 'high_court_license', 'supreme_court_license', 'degree', 'other'];

    /** @var array<string, list<string>> */
    private const TRANSITIONS = [
        'unverified' => ['submitted'],
        'information_requested' => ['submitted'],
        'rejected' => ['submitted'],
        'submitted' => ['under_review', 'approved', 'rejected', 'information_requested'],
        'under_review' => ['approved', 'rejected', 'information_requested'],
        'approved' => ['suspended'],
        'suspended' => ['approved'],
    ];

    public function currentRequest(LawyerProfile $profile): VerificationRequest
    {
        $latest = $profile->latestVerificationRequest()->first();

        if ($latest && ! in_array($latest->status, [S::Approved, S::Suspended], true)) {
            return $latest;
        }

        return $latest ?? $profile->verificationRequests()->create(['status' => S::Unverified]);
    }

    public function addDocument(VerificationRequest $request, string $type, UploadedFile $file): VerificationDocument
    {
        if (! $request->isEditableByLawyer()) {
            throw ValidationException::withMessages(['file' => __('Documents cannot be changed while your application is under review.')]);
        }

        $disk = config('legal.uploads.disk', 'local');
        $path = $file->storeAs('verification/'.$request->lawyer_profile_id, Str::random(40).'.'.$file->guessExtension(), ['disk' => $disk]);

        return $request->documents()->create([
            'type' => $type, 'disk' => $disk, 'path' => $path,
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 200, ''),
            'mime' => $file->getMimeType(), 'size' => $file->getSize(),
        ]);
    }

    public function submit(VerificationRequest $request, User $lawyer): VerificationRequest
    {
        $profile = $request->lawyerProfile;

        if (! $profile->bar_council_id || ! $profile->enrollment_number || ! $profile->advocate_category) {
            throw ValidationException::withMessages(['profile' => __('Complete your Bar Council and enrollment details before submitting.')]);
        }

        if (! $request->documents()->where('type', 'bar_license')->exists() || ! $request->documents()->whereIn('type', ['cnic_front'])->exists()) {
            throw ValidationException::withMessages(['documents' => __('Upload at least your CNIC (front) and Bar license.')]);
        }

        return $this->transition($request, S::Submitted, $lawyer, null, ['submitted_at' => now()]);
    }

    public function transition(VerificationRequest $request, S $to, ?User $actor, ?string $note = null, array $attributes = []): VerificationRequest
    {
        $from = $request->status;

        if (! in_array($to->value, self::TRANSITIONS[$from->value] ?? [], true)) {
            throw ValidationException::withMessages(['status' => __('This status change is not allowed (:from → :to).', ['from' => $from->label(), 'to' => $to->label()])]);
        }

        if (in_array($to, [S::Rejected, S::InformationRequested, S::Suspended], true) && blank($note)) {
            throw ValidationException::withMessages(['note' => __('Please give a reason.')]);
        }

        return DB::transaction(function () use ($request, $from, $to, $actor, $note, $attributes): VerificationRequest {
            $isReviewer = $actor && $actor->isPlatformStaff();

            $request->update([
                ...$attributes,
                'status' => $to,
                'reviewer_id' => $isReviewer ? $actor->id : $request->reviewer_id,
                'reviewed_at' => $isReviewer ? now() : $request->reviewed_at,
                'reviewer_notes' => $isReviewer && $note ? $note : $request->reviewer_notes,
                'information_requested' => $to === S::InformationRequested ? $note : $request->information_requested,
            ]);

            $request->events()->create(['actor_id' => $actor?->id, 'from_status' => $from->value, 'to_status' => $to->value, 'note' => $note]);

            $profile = $request->lawyerProfile;
            $profile->forceFill([
                'verification_status' => $to,
                'verified_at' => $to === S::Approved ? now() : ($to === S::Suspended ? $profile->verified_at : null),
            ])->save();

            activity('verification')->causedBy($actor)->performedOn($profile)->withProperties(['from' => $from->value, 'to' => $to->value])->log('verification_'.$to->value);

            if ($isReviewer) {
                $profile->user->notify(new VerificationStatusChanged($to, $note));
            }

            return $request;
        });
    }
}
