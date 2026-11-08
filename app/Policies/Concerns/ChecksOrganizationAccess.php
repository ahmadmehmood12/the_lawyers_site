<?php

namespace App\Policies\Concerns;

use App\Models\User;
use App\Services\Access\OrganizationAccess;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;

/**
 * Policy helper: non-members get 404 (existence is not leaked across tenants),
 * members without the permission get 403.
 */
trait ChecksOrganizationAccess
{
    protected function access(): OrganizationAccess
    {
        return app(OrganizationAccess::class);
    }

    protected function inOrganization(User $user, Model $model, string $permission): Response
    {
        $organizationId = (int) $model->getAttribute('organization_id');

        if (! $this->access()->isMember($user, $organizationId)) {
            return Response::denyAsNotFound();
        }

        return $this->access()->allows($user, $organizationId, $permission) ? Response::allow() : Response::deny();
    }

    protected function currentOrganizationAllows(User $user, string $permission): bool
    {
        $organization = request()->attributes->get('organization');

        return $organization !== null && $this->access()->allows($user, $organization, $permission);
    }
}
