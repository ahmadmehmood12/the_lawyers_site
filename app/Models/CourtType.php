<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'name_ur', 'slug', 'level', 'sort_order'])]
class CourtType extends Model
{
    public function courts(): HasMany
    {
        return $this->hasMany(Court::class);
    }
}
