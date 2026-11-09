<?php

namespace App\Models;

use App\Enums\CalendarEventStatus;
use App\Enums\CalendarEventType;
use App\Enums\CalendarVisibility;
use App\Enums\Recurrence;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A user-created calendar entry (meeting, reminder, court visit...). Never deleted:
 * cancelling keeps the row, rescheduling keeps original_starts_at and logs a change
 * (docs/Modules/Calendar.md). organization_id is null for clients' and admins' personal events.
 */
#[Fillable(['organization_id', 'user_id', 'assigned_to', 'legal_case_id', 'client_id', 'type', 'title', 'description', 'location', 'starts_at', 'ends_at', 'all_day', 'visibility', 'status', 'original_starts_at', 'original_ends_at', 'recurrence', 'recurrence_interval', 'recurrence_until', 'cancellation_reason', 'created_by'])]
class CalendarEvent extends Model
{
    /** @var array<string, mixed> */
    protected $attributes = [
        'type' => 'meeting',
        'visibility' => 'private',
        'status' => 'scheduled',
        'recurrence' => 'none',
        'recurrence_interval' => 1,
        'all_day' => false,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CalendarEventType::class,
            'status' => CalendarEventStatus::class,
            'visibility' => CalendarVisibility::class,
            'recurrence' => Recurrence::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'original_starts_at' => 'datetime',
            'original_ends_at' => 'datetime',
            'recurrence_until' => 'date',
            'all_day' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function changes(): HasMany
    {
        return $this->hasMany(CalendarEventChange::class)->orderBy('id');
    }

    public function wasRescheduled(): bool
    {
        return $this->original_starts_at !== null && ! $this->original_starts_at->equalTo($this->starts_at);
    }
}
