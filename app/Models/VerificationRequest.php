<?php

namespace App\Models;

use App\Enums\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['lawyer_profile_id', 'status', 'submitted_at', 'reviewer_id', 'reviewed_at', 'reviewer_notes', 'information_requested'])]
class VerificationRequest extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => VerificationStatus::class,
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function lawyerProfile(): BelongsTo
    {
        return $this->belongsTo(LawyerProfile::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(VerificationDocument::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(VerificationEvent::class)->orderBy('id');
    }

    /** A lawyer may only add documents or resubmit while the request is editable. */
    public function isEditableByLawyer(): bool
    {
        return in_array($this->status, [VerificationStatus::Unverified, VerificationStatus::InformationRequested, VerificationStatus::Rejected], true);
    }
}
