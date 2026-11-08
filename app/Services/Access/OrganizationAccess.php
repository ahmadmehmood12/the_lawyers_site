<?php

namespace App\Services\Access;

use App\Enums\MembershipStatus;
use App\Enums\OrgRole;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;

/**
 * Single source of truth for organization-scoped permissions.
 * Memberships are memoized per request (the service is a scoped singleton).
 * See docs/Architecture/Authorization.md.
 */
class OrganizationAccess
{
    /** @var array<string, OrganizationMember|null> */
    private array $memberships = [];

    public function membership(User $user, Organization|int $organization): ?OrganizationMember
    {
        $organizationId = $organization instanceof Organization ? $organization->getKey() : $organization;
        $key = $user->getKey().':'.$organizationId;

        if (! array_key_exists($key, $this->memberships)) {
            $this->memberships[$key] = OrganizationMember::query()
                ->where('user_id', $user->getKey())
                ->where('organization_id', $organizationId)
                ->where('status', MembershipStatus::Active->value)
                ->first();
        }

        return $this->memberships[$key];
    }

    public function role(User $user, Organization|int $organization): ?OrgRole
    {
        return $this->membership($user, $organization)?->role;
    }

    public function isMember(User $user, Organization|int $organization): bool
    {
        return $this->membership($user, $organization) !== null;
    }

    public function allows(User $user, Organization|int $organization, string $permission): bool
    {
        if ($user->isSuspended()) {
            return false;
        }

        $role = $this->role($user, $organization);

        return $role !== null && in_array($permission, $role->permissions(), true);
    }

    /**
     * @return list<string>
     */
    public function permissions(User $user, Organization|int $organization): array
    {
        return $this->role($user, $organization)?->permissions() ?? [];
    }

    public function forget(): void
    {
        $this->memberships = [];
    }
}
