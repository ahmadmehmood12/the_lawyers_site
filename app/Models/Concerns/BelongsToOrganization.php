<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a model as tenant data owned by an organization. Controllers must
 * always resolve these through {@see forOrganization()} or a policy that
 * compares organization_id. See docs/Architecture/Authorization.md.
 */
trait BelongsToOrganization
{
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    #[Scope]
    protected function forOrganization(Builder $query, Organization|int $organization): void
    {
        $query->where($this->qualifyColumn('organization_id'), $organization instanceof Organization ? $organization->getKey() : $organization);
    }

    public function belongsToOrganization(Organization|int|null $organization): bool
    {
        if ($organization === null) {
            return false;
        }

        return (int) $this->organization_id === (int) ($organization instanceof Organization ? $organization->getKey() : $organization);
    }
}
