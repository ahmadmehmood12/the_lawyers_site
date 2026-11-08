<?php

namespace App\Policies;

use App\Models\LegalCase;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class LegalCasePolicy
{
    use ChecksOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'cases.view_all') || $this->currentOrganizationAllows($user, 'cases.view_assigned');
    }

    /** Members see all cases with cases.view_all, otherwise only cases they are assigned to. */
    public function view(User $user, LegalCase $case): Response
    {
        $all = $this->inOrganization($user, $case, 'cases.view_all');

        if ($all->allowed() || $all->status() === 404) {
            return $all;
        }

        $assigned = $this->access()->allows($user, $case->organization_id, 'cases.view_assigned')
            && ($case->isAssignedTo($user) || $case->hearings()->where('assigned_lawyer_id', $user->id)->exists());

        return $assigned ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'cases.create');
    }

    public function update(User $user, LegalCase $case): Response
    {
        $view = $this->view($user, $case);

        return $view->allowed() ? $this->inOrganization($user, $case, 'cases.update') : $view;
    }

    public function assign(User $user, LegalCase $case): Response
    {
        $view = $this->view($user, $case);

        return $view->allowed() ? $this->inOrganization($user, $case, 'cases.assign') : $view;
    }

    public function archive(User $user, LegalCase $case): Response
    {
        $view = $this->view($user, $case);

        return $view->allowed() ? $this->inOrganization($user, $case, 'cases.archive') : $view;
    }

    /** Ability for case-scoped sub-resources (hearings, tasks, expenses…) requiring an org permission. */
    public function manageWithin(User $user, LegalCase $case, string $permission): Response
    {
        $view = $this->view($user, $case);

        return $view->allowed() ? $this->inOrganization($user, $case, $permission) : $view;
    }

    /** Client portal: linked client account and case shared. */
    public function viewAsClient(User $user, LegalCase $case): Response
    {
        $shared = $user->isClient()
            && $case->share_with_client
            && $case->clients()->where('clients.user_id', $user->id)->exists();

        return $shared ? Response::allow() : Response::denyAsNotFound();
    }
}
