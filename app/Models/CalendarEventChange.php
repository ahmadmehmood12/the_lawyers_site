<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One reschedule, cancellation or completion of a calendar event; append-only. */
#[Fillable(['calendar_event_id', 'action', 'from_starts_at', 'from_ends_at', 'to_starts_at', 'to_ends_at', 'reason', 'user_id'])]
class CalendarEventChange extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_starts_at' => 'datetime',
            'from_ends_at' => 'datetime',
            'to_starts_at' => 'datetime',
            'to_ends_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
