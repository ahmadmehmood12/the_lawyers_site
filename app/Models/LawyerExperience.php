<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['lawyer_profile_id', 'position', 'organization', 'start_year', 'end_year', 'is_current', 'description'])]
class LawyerExperience extends Model
{
    public function lawyerProfile(): BelongsTo
    {
        return $this->belongsTo(LawyerProfile::class);
    }

    protected function casts(): array
    {
        return ['is_current' => 'boolean'];
    }
}
