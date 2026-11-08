<?php

namespace App\Models;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'lawyer_id', 'client_id', 'requested_by', 'legal_case_id', 'contact_name', 'contact_phone', 'contact_email', 'mode', 'kind', 'starts_at', 'ends_at', 'status', 'fee', 'client_message', 'lawyer_notes', 'meeting_link', 'cancellation_reason', 'rescheduled_from_id'])]
class Appointment extends Model
{
    use BelongsToOrganization;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'requested', 'mode' => 'in_person', 'kind' => 'consultation'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => AppointmentStatus::class,
            'mode' => AppointmentMode::class,
            'fee' => 'decimal:2',
        ];
    }

    public function lawyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lawyer_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }
}
