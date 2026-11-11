<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A tehsil (taluka / subdivision) of a district. Reference data, editable in Admin, Reference data. */
#[Fillable(['district_id', 'name', 'name_ur'])]
class Tehsil extends Model
{
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}
