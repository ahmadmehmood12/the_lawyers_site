<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class TaskPolicy
{
    use ChecksOrganizationAccess;

    public function manage(User $user, Task $task): Response
    {
        $base = $this->inOrganization($user, $task, 'tasks.manage');

        if (! $base->allowed()) {
            return $task->assigned_to === $user->id && $this->access()->isMember($user, $task->organization_id) ? Response::allow() : $base;
        }

        return $base;
    }
}
