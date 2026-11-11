<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Founder, Patron, Legal Advisor... (admin-defined; groups the homepage team section). */
#[Fillable(['name', 'name_ur', 'sort_order'])]
class TeamDesignation extends Model
{
    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }
}
