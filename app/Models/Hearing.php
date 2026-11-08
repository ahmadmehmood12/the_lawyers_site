<?php

namespace App\Models;

use App\Enums\Attendance;
use App\Enums\HearingStatus;
use App\Enums\HearingType;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A single scheduled court appearance. Hearings are append-only history:
 * rescheduling creates a new row linked via rescheduled_to_id and the
 * original keeps its record. See docs/Modules/Hearings.md.
 */
#[Fillable([
    'organization_id', 'legal_case_id', 'court_id', 'judge_id', 'judge_name', 'courtroom', 'hearing_date', 'hearing_time',
    'hearing_type', 'purpose', 'assigned_lawyer_id', 'preparation_notes', 'status', 'previous_hearing_id', 'rescheduled_to_id',
    'reschedule_reason', 'cancellation_reason', 'visible_to_client', 'held_on', 'lawyer_attendance', 'client_attendance',
    'opposing_counsel_attendance', 'proceedings', 'arguments', 'evidence', 'documents_submitted', 'order_passed',
    'adjournment_reason', 'next_hearing_date', 'next_hearing_purpose', 'internal_notes', 'client_note',
    'outcome_recorded_by', 'outcome_recorded_at', 'created_by',
])]
#[Hidden(['internal_notes'])]
class Hearing extends Model
{
    use BelongsToOrganization, HasFactory, LogsActivity;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'scheduled', 'hearing_type' => 'regular', 'visible_to_client' => true];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hearing_date' => 'date',
            'held_on' => 'date',
            'next_hearing_date' => 'date',
            'outcome_recorded_at' => 'datetime',
            'status' => HearingStatus::class,
            'hearing_type' => HearingType::class,
            'lawyer_attendance' => Attendance::class,
            'client_attendance' => Attendance::class,
            'opposing_counsel_attendance' => Attendance::class,
            'visible_to_client' => 'boolean',
            'internal_notes' => 'encrypted',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('hearings')
            ->logOnly(['hearing_date', 'hearing_time', 'status', 'purpose', 'assigned_lawyer_id', 'court_id', 'order_passed', 'proceedings', 'next_hearing_date', 'lawyer_attendance'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function judge(): BelongsTo
    {
        return $this->belongsTo(Judge::class);
    }

    public function assignedLawyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_lawyer_id');
    }

    public function previousHearing(): BelongsTo
    {
        return $this->belongsTo(Hearing::class, 'previous_hearing_id');
    }

    public function rescheduledTo(): BelongsTo
    {
        return $this->belongsTo(Hearing::class, 'rescheduled_to_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'outcome_recorded_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function deliveries(): MorphMany
    {
        return $this->morphMany(NotificationDelivery::class, 'subject');
    }

    public function startsAt(): Carbon
    {
        $date = $this->hearing_date->copy();

        return $this->hearing_time ? $date->setTimeFromTimeString($this->hearing_time) : $date->setTime(9, 0);
    }

    public function isUpcoming(): bool
    {
        return $this->status === HearingStatus::Scheduled;
    }

    public function hasOutcome(): bool
    {
        return $this->outcome_recorded_at !== null;
    }
}
