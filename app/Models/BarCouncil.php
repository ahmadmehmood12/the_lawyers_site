<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'name_ur', 'code', 'province_id'])]
class BarCouncil extends Model
{
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }
}
