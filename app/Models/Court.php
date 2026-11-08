<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['court_type_id', 'parent_id', 'province_id', 'district_id', 'city_id', 'name', 'name_ur', 'slug', 'bench', 'address', 'phone', 'is_active'])]
class Court extends Model
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

    public function courtType(): BelongsTo
    {
        return $this->belongsTo(CourtType::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'parent_id');
    }

    public function benches(): HasMany
    {
        return $this->hasMany(Court::class, 'parent_id');
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function judges(): HasMany
    {
        return $this->hasMany(Judge::class);
    }
}
