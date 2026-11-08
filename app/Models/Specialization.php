<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'name_ur', 'slug', 'description', 'description_ur', 'icon', 'sort_order', 'is_active'])]
class Specialization extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function lawyers(): BelongsToMany
    {
        return $this->belongsToMany(LawyerProfile::class, 'lawyer_specialization');
    }
}
