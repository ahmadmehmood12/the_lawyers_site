<?php

namespace App\Services\Access;

use App\Models\Organization;
use App\Models\User;

/**
 * Resolves the organization a professional is currently working in.
 * Falls back to the user's first active membership and persists the choice.
 */
class CurrentOrganization
{
    private ?Organization $resolved = null;

    private bool $wasResolved = false;

    public function __construct(private OrganizationAccess $access) {}

    public function for(User $user): ?Organization
    {
        if ($this->wasResolved) {
            return $this->resolved;
        }

        $this->wasResolved = true;

        if ($user->current_organization_id && $this->access->isMember($user, $user->current_organization_id)) {
            return $this->resolved = Organization::find($user->current_organization_id);
        }

        $first = $user->organizations()->orderBy('organizations.id')->first();

        if ($first) {
            $user->forceFill(['current_organization_id' => $first->id])->save();
        }

        return $this->resolved = $first;
    }

    public function switchTo(User $user, Organization $organization): bool
    {
        if (! $this->access->isMember($user, $organization)) {
            return false;
        }

        $user->forceFill(['current_organization_id' => $organization->id])->save();
        $this->resolved = $organization;
        $this->wasResolved = true;

        return true;
    }
}
