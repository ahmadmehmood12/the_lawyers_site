<?php

namespace App\Policies;

use App\Models\Draft;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class DraftPolicy
{
    use ChecksOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'drafts.manage');
    }

    public function create(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'drafts.manage');
    }

    public function view(User $user, Draft $draft): Response
    {
        $base = $this->inOrganization($user, $draft, 'drafts.manage');

        if ($base->allowed() && $draft->legalCase) {
            return Gate::forUser($user)->inspect('view', $draft->legalCase);
        }

        return $base;
    }

    public function update(User $user, Draft $draft): Response
    {
        return $this->view($user, $draft);
    }

    public function approve(User $user, Draft $draft): Response
    {
        $view = $this->view($user, $draft);

        return $view->allowed() ? $this->inOrganization($user, $draft, 'drafts.approve') : $view;
    }
}
