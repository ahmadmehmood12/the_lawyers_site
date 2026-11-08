<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class AppointmentPolicy
{
    use ChecksOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'appointments.manage');
    }

    public function manage(User $user, Appointment $appointment): Response
    {
        if ($appointment->lawyer_id === $user->id && $this->access()->isMember($user, $appointment->organization_id)) {
            return Response::allow();
        }

        return $this->inOrganization($user, $appointment, 'appointments.manage');
    }

    /** The client who requested it (or whose record it is linked to) can view and cancel. */
    public function manageAsClient(User $user, Appointment $appointment): Response
    {
        $own = $user->isClient() && ($appointment->requested_by === $user->id || $appointment->client()->where('user_id', $user->id)->exists());

        return $own ? Response::allow() : Response::denyAsNotFound();
    }
}
