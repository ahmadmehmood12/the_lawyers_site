<?php

namespace App\Models;

use App\Enums\PlanFeature;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'name_ur', 'audience', 'description', 'price_monthly', 'price_yearly', 'trial_days', 'is_active', 'sort_order'])]
class Plan extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function features(): HasMany
    {
        return $this->hasMany(PlanFeatureLimit::class);
    }

    /**
     * Configured limit for a feature: null = unlimited, 0 = not included.
     * A feature without a row is treated as not included.
     */
    public function limitFor(PlanFeature $feature): ?int
    {
        $row = $this->features->firstWhere('feature', $feature);

        return $row ? $row->limit_value : 0;
    }
}
