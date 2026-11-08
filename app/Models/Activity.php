<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

/**
 * Audit entry with the organization it happened in (set automatically from the
 * subject in AppServiceProvider). Registered as activitylog.activity_model.
 */
class Activity extends SpatieActivity
{
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
