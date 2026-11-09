<?php

namespace App\Policies;

use App\Enums\CalendarVisibility;
use App\Models\CalendarEvent;
use App\Models\Client;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

/**
 * Calendar events (docs/Modules/Calendar.md). Anyone who may not see an event gets 404.
 * Changes: the owner, the assigned member, or firm managers (organization.settings).
 */
class CalendarEventPolicy
{
    use ChecksOrganizationAccess;

    public function view(User $user, CalendarEvent $event): Response
    {
        if ($event->user_id === $user->id || $event->assigned_to === $user->id) {
            return Response::allow();
        }

        if ($event->visibility === CalendarVisibility::Client && $event->client_id
            && Client::query()->whereKey($event->client_id)->where('user_id', $user->id)->exists()) {
            return Response::allow();
        }

        if (! $event->organization_id || $event->visibility === CalendarVisibility::Private || ! $this->access()->isMember($user, $event->organization_id)) {
            return Response::denyAsNotFound();
        }

        if ($event->legal_case_id) {
            return $user->can('view', $event->legalCase) ? Response::allow() : Response::denyAsNotFound();
        }

        return Response::allow();
    }

    public function update(User $user, CalendarEvent $event): Response
    {
        $view = $this->view($user, $event);
        if (! $view->allowed()) {
            return $view;
        }

        if ($event->user_id === $user->id || $event->assigned_to === $user->id) {
            return Response::allow();
        }

        return $event->organization_id && $this->access()->allows($user, $event->organization_id, 'organization.settings')
            ? Response::allow()
            : Response::deny(__('Only the person who created this event, the assigned member or a firm manager can change it.'));
    }
}
