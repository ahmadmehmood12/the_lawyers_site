<?php

namespace App\Policies;

use App\Models\Hearing;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class HearingPolicy
{
    use ChecksOrganizationAccess;

    public function view(User $user, Hearing $hearing): Response
    {
        $base = $this->inOrganization($user, $hearing, 'hearings.view');

        if (! $base->allowed()) {
            return $base;
        }

        return $this->canSeeCase($user, $hearing) ? Response::allow() : Response::denyAsNotFound();
    }

    public function update(User $user, Hearing $hearing): Response
    {
        $view = $this->view($user, $hearing);

        return $view->allowed() ? $this->inOrganization($user, $hearing, 'hearings.manage') : $view;
    }

    public function recordOutcome(User $user, Hearing $hearing): Response
    {
        $view = $this->view($user, $hearing);

        return $view->allowed() ? $this->inOrganization($user, $hearing, 'hearings.record_outcome') : $view;
    }

    /** Diary-wide permission or assigned lawyer, else must be able to see the case. */
    private function canSeeCase(User $user, Hearing $hearing): bool
    {
        if ($hearing->assigned_lawyer_id === $user->id
            || $this->access()->allows($user, $hearing->organization_id, 'diary.view_all')
            || $this->access()->allows($user, $hearing->organization_id, 'cases.view_all')) {
            return true;
        }

        return $hearing->legalCase->isAssignedTo($user);
    }
}
