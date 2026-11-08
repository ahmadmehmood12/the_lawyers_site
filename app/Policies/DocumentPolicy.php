<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationAccess;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class DocumentPolicy
{
    use ChecksOrganizationAccess;

    /** Staff: documents.view, plus documents.view_confidential for confidential files, plus case visibility. */
    public function view(User $user, Document $document): Response
    {
        if ($user->isClient()) {
            return $this->viewAsClient($user, $document);
        }

        $base = $this->inOrganization($user, $document, 'documents.view');

        if (! $base->allowed()) {
            return $base;
        }

        if ($document->is_confidential && ! $this->access()->allows($user, $document->organization_id, 'documents.view_confidential')) {
            return Response::denyAsNotFound();
        }

        if ($document->legalCase) {
            return Gate::forUser($user)->inspect('view', $document->legalCase);
        }

        return Response::allow();
    }

    public function upload(User $user): bool
    {
        return $this->currentOrganizationAllows($user, 'documents.upload');
    }

    public function update(User $user, Document $document): Response
    {
        $view = $this->view($user, $document);

        return $view->allowed() ? $this->inOrganization($user, $document, 'documents.upload') : $view;
    }

    public function share(User $user, Document $document): Response
    {
        $view = $this->view($user, $document);

        return $view->allowed() ? $this->inOrganization($user, $document, 'documents.share') : $view;
    }

    public function delete(User $user, Document $document): Response
    {
        $view = $this->view($user, $document);

        return $view->allowed() ? $this->inOrganization($user, $document, 'documents.delete') : $view;
    }

    /** Clients only reach documents through an active share to one of their client records, or ones they uploaded. */
    public function viewAsClient(User $user, Document $document): Response
    {
        if (! $user->isClient()) {
            return Response::denyAsNotFound();
        }

        $shared = $document->activeShares()->whereHas('client', fn ($q) => $q->where('user_id', $user->id))->exists();
        $ownUpload = $document->source === 'client' && $document->uploaded_by === $user->id;

        return ($shared || $ownUpload) ? Response::allow() : Response::denyAsNotFound();
    }
}
