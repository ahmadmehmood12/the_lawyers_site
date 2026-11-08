<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['lawyer_profile_id', 'user_id', 'appointment_id', 'legal_case_id', 'rating', 'title', 'comment', 'status', 'response', 'responded_at', 'moderated_by', 'moderated_at'])]
class Review extends Model
{
    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'pending'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReviewStatus::class,
            'rating' => 'integer',
            'responded_at' => 'datetime',
            'moderated_at' => 'datetime',
        ];
    }

    public function lawyerProfile(): BelongsTo
    {
        return $this->belongsTo(LawyerProfile::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
