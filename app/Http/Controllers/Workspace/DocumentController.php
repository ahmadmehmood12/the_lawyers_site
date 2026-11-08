<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\DocumentCategory;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\DocumentVersion;
use App\Models\LegalCase;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Cases\Timeline;
use App\Services\Documents\DocumentVault;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        abort_unless($access->allows($request->user(), $organization, 'documents.view'), 403);

        $documents = self::listFor(Document::query()->forOrganization($organization), $request->user())
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->string('category')->toString(), fn ($q, $c) => $q->where('category', $c))
            ->when($request->integer('case_id'), fn ($q, $id) => $q->where('legal_case_id', $id))
            ->when($request->integer('client_id'), fn ($q, $id) => $q->where('client_id', $id))
            ->paginate(25)->withQueryString()->through(fn ($d) => self::present($d));

        return Inertia::render('Workspace/Documents/Index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'category', 'case_id', 'client_id']),
            'options' => [
                'categories' => DocumentCategory::options(),
                'cases' => LegalCase::query()->visibleTo($request->user(), $organization)->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
                'clients' => ReferenceOptions::clients($organization),
            ],
            'can' => ['upload' => $access->allows($request->user(), $organization, 'documents.upload')],
        ]);
    }

    public function store(Request $request, DocumentVault $vault, Timeline $timeline): RedirectResponse
    {
        $this->authorize('upload', Document::class);
        $organization = $this->organization();
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:'.implode(',', config('legal.uploads.document_mimes')), 'max:'.config('legal.uploads.max_kb')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::enum(DocumentCategory::class)],
            'legal_case_id' => ['nullable', 'integer'],
            'client_id' => ['nullable', 'integer'],
            'is_confidential' => ['boolean'],
        ]);

        $case = null;
        if (! empty($validated['legal_case_id'])) {
            $case = LegalCase::query()->forOrganization($organization)->findOrFail($validated['legal_case_id']);
            $this->authorize('view', $case);
        }

        if (! empty($validated['client_id'])) {
            Client::query()->forOrganization($organization)->findOrFail($validated['client_id']);
        }

        $document = $vault->store($organization, $request->user(), $request->file('file'), [
            ...collect($validated)->except('file')->all(),
            'source' => 'lawyer',
        ]);

        if ($case) {
            $timeline->record($case, 'document_added', __('Document added: :title', ['title' => $document->title]), null, $document);
        }

        return back()->with('success', __('Document uploaded.'));
    }

    public function show(Request $request, Document $document): Response
    {
        $this->authorize('view', $document);
        $document->load(['versions.uploader:id,name', 'legalCase:id,title,reference', 'client:id,name', 'shares.client:id,name', 'accessLogs' => fn ($q) => $q->with('user:id,name')->limit(50)]);
        $user = $request->user();

        return Inertia::render('Workspace/Documents/Show', [
            'document' => [
                ...self::present($document),
                'description' => $document->description,
                'versions' => $document->versions->map(fn (DocumentVersion $v) => ['id' => $v->id, 'version' => $v->version, 'original_name' => $v->original_name, 'mime' => $v->mime, 'size' => $v->size, 'note' => $v->note, 'uploaded_by' => $v->uploader->name, 'created_at' => $v->created_at->toIso8601String(), 'sha256' => $v->sha256]),
                'shares' => $document->shares->map(fn (DocumentShare $s) => ['id' => $s->id, 'client' => $s->client->name, 'can_download' => $s->can_download, 'expires_at' => $s->expires_at?->toIso8601String(), 'revoked_at' => $s->revoked_at?->toIso8601String(), 'active' => ! $s->revoked_at && (! $s->expires_at || $s->expires_at->isFuture())]),
                'access_logs' => $document->accessLogs->map(fn ($l) => ['id' => $l->id, 'action' => $l->action, 'user' => $l->user?->name, 'ip' => $l->ip_address, 'created_at' => $l->created_at->toIso8601String()]),
            ],
            'clients' => $document->legalCase
                ? $document->legalCase->clients()->get(['clients.id', 'clients.name'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->name])
                : ReferenceOptions::clients($this->organization()),
            'can' => [
                'update' => $user->can('update', $document),
                'share' => $user->can('share', $document),
                'delete' => $user->can('delete', $document),
            ],
        ]);
    }

    public function addVersion(Request $request, Document $document, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('update', $document);
        $request->validate([
            'file' => ['required', 'file', 'mimes:'.implode(',', config('legal.uploads.document_mimes')), 'max:'.config('legal.uploads.max_kb')],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $vault->addVersion($document, $request->user(), $request->file('file'), $request->input('note'));

        return back()->with('success', __('New version uploaded.'));
    }

    public function download(Request $request, Document $document, DocumentVault $vault, ?DocumentVersion $version = null): StreamedResponse
    {
        $this->authorize('view', $document);

        return $vault->stream($document, $version, $request->user(), $request->boolean('inline'));
    }

    public function share(Request $request, Document $document, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('share', $document);
        $validated = $request->validate([
            'client_id' => ['required', 'integer'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'can_download' => ['boolean'],
        ]);
        $client = Client::query()->forOrganization($document->organization_id)->findOrFail($validated['client_id']);

        $vault->share($document, $client, $request->user(), $validated['expires_at'] ?? null, $request->boolean('can_download', true));

        return back()->with('success', __('Document shared with :name.', ['name' => $client->name]));
    }

    public function revokeShare(Request $request, DocumentShare $share, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('share', $share->document);
        $vault->revoke($share, $request->user());

        return back()->with('success', __('Access revoked.'));
    }

    public function update(Request $request, Document $document): RedirectResponse
    {
        $this->authorize('update', $document);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::enum(DocumentCategory::class)],
            'is_confidential' => ['boolean'],
        ]);

        if (! empty($validated['is_confidential']) && $document->activeShares()->exists()) {
            return back()->with('error', __('Revoke client access before marking this document confidential.'));
        }

        $document->update($validated);

        return back()->with('success', __('Document updated.'));
    }

    /** Soft delete: the file and access history are retained for the audit trail. */
    public function destroy(Request $request, Document $document, DocumentVault $vault): RedirectResponse
    {
        $this->authorize('delete', $document);
        $document->activeShares()->update(['revoked_at' => now()]);
        $vault->log($document, null, $request->user(), 'delete');
        $document->delete();

        return redirect()->route('documents.index')->with('success', __('Document moved to archive.'));
    }

    /**
     * Applies confidentiality and case-visibility rules to a document query.
     *
     * @param  Builder<Document>  $query
     * @return Builder<Document>
     */
    public static function listFor(Builder $query, User $user): Builder
    {
        $organization = request()->attributes->get('organization');
        $access = app(OrganizationAccess::class);

        return $query->with(['currentVersion', 'legalCase:id,title,reference', 'client:id,name', 'uploader:id,name'])
            ->withCount('activeShares')
            ->when($organization && ! $access->allows($user, $organization, 'documents.view_confidential'), fn ($q) => $q->where('is_confidential', false))
            ->when($organization && ! $access->allows($user, $organization, 'cases.view_all'), fn ($q) => $q->where(fn ($w) => $w->whereNull('legal_case_id')
                ->orWhereIn('legal_case_id', LegalCase::query()->visibleTo($user, $organization)->select('id'))))
            ->latest('updated_at')->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(Document $d): array
    {
        return [
            'id' => $d->id, 'title' => $d->title, 'category' => $d->category->value, 'category_label' => $d->category->label(),
            'is_confidential' => $d->is_confidential, 'source' => $d->source,
            'mime' => $d->currentVersion?->mime, 'size' => $d->currentVersion?->size, 'version' => $d->currentVersion?->version,
            'case' => $d->legalCase ? ['id' => $d->legalCase->id, 'title' => $d->legalCase->title, 'reference' => $d->legalCase->reference] : null,
            'client' => $d->client?->name,
            'uploaded_by' => $d->uploader?->name,
            'shared_count' => $d->active_shares_count ?? null,
            'updated_at' => $d->updated_at->toIso8601String(),
        ];
    }
}
