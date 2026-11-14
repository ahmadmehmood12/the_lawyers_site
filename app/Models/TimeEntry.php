<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Time a lawyer spent on a case. Running while ended_at is null; `seconds` is set on stop. */
#[Fillable(['organization_id', 'legal_case_id', 'user_id', 'description', 'started_at', 'ended_at', 'seconds', 'billable'])]
class TimeEntry extends Model
{
    use BelongsToOrganization;

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime', 'seconds' => 'integer', 'billable' => 'boolean'];
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Seconds so far, counting a running entry up to now. */
    public function elapsed(): int
    {
        return $this->ended_at ? $this->seconds : (int) $this->started_at->diffInSeconds(now());
    }
}
