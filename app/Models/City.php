<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['district_id', 'name', 'name_ur', 'slug'])]
class City extends Model
{
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}
