<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;

class InvoicePolicy
{
    use ChecksOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'finance.view');
    }

    public function create(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'finance.invoice');
    }

    public function view(User $user, Invoice $invoice): Response
    {
        if ($user->isClient()) {
            return $this->viewAsClient($user, $invoice);
        }

        return $this->inOrganization($user, $invoice, 'finance.view');
    }

    public function update(User $user, Invoice $invoice): Response
    {
        return $this->inOrganization($user, $invoice, 'finance.invoice');
    }

    public function recordPayment(User $user, Invoice $invoice): Response
    {
        return $this->inOrganization($user, $invoice, 'finance.record_payment');
    }

    public function refund(User $user, Invoice $invoice): Response
    {
        return $this->inOrganization($user, $invoice, 'finance.refund');
    }

    public function export(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'finance.export');
    }

    /** Clients see issued (non-draft) invoices addressed to one of their client records. */
    public function viewAsClient(User $user, Invoice $invoice): Response
    {
        $own = $user->isClient()
            && $invoice->status->value !== 'draft'
            && $invoice->client()->where('user_id', $user->id)->exists();

        return $own ? Response::allow() : Response::denyAsNotFound();
    }
}
