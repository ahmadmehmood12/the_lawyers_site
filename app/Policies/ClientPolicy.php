<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class ClientPolicy
{
    use ChecksOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'clients.view');
    }

    public function view(User $user, Client $client): Response
    {
        return $this->inOrganization($user, $client, 'clients.view');
    }

    public function viewSensitive(User $user, Client $client): Response
    {
        return $this->inOrganization($user, $client, 'clients.view_sensitive');
    }

    public function create(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'clients.create');
    }

    public function update(User $user, Client $client): Response
    {
        return $this->inOrganization($user, $client, 'clients.update');
    }

    public function delete(User $user, Client $client): Response
    {
        return $this->inOrganization($user, $client, 'clients.delete');
    }
}
