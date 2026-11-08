<?php

namespace App\Services\Documents;

use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\DocumentShare;
use App\Models\DocumentVersion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Private, versioned document storage (docs/Modules/Documents.md).
 * Files live on a non-public disk under org-scoped random paths and are only
 * ever streamed through authorized controller actions, with every access logged.
 */
class DocumentVault
{
    /** Allowed MIME types, verified from file content (not the client-supplied extension). */
    public const MIMES = [
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    public function disk(): string
    {
        return config('legal.uploads.disk', 'local');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function store(Organization $organization, User $uploader, UploadedFile $file, array $attributes): Document
    {
        $this->assertSafe($file);

        return DB::transaction(function () use ($organization, $uploader, $file, $attributes): Document {
            $document = $organization->documents()->create([
                ...$attributes,
                'uploaded_by' => $uploader->id,
            ]);

            $this->addVersion($document, $uploader, $file);

            return $document->refresh();
        });
    }

    public function addVersion(Document $document, User $uploader, UploadedFile $file, ?string $note = null): DocumentVersion
    {
        $this->assertSafe($file);
        $next = (int) $document->versions()->max('version') + 1;
        $path = $file->storeAs(
            'documents/'.$document->organization_id.'/'.now()->format('Y/m'),
            Str::random(40).'.'.$file->guessExtension(),
            ['disk' => $this->disk()],
        );

        $version = $document->versions()->create([
            'version' => $next,
            'disk' => $this->disk(),
            'path' => $path,
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 200, ''),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()),
            'note' => $note,
            'uploaded_by' => $uploader->id,
        ]);

        $document->forceFill(['current_version_id' => $version->id])->save();
        $this->log($document, $version, $uploader, 'upload');

        return $version;
    }

    /** Stream a version inline (preview) or as attachment, logging the access. */
    public function stream(Document $document, ?DocumentVersion $version, User $user, bool $inline): StreamedResponse
    {
        $version ??= $document->currentVersion;
        abort_unless($version && $version->document_id === $document->id, 404);

        $this->log($document, $version, $user, $inline ? 'preview' : 'download');

        $disposition = $inline && in_array($version->mime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], true) ? 'inline' : 'attachment';

        return Storage::disk($version->disk)->response($version->path, $version->original_name, [
            'Content-Type' => $version->mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        ], $disposition);
    }

    public function share(Document $document, Client $client, User $by, ?string $expiresAt, bool $canDownload = true): DocumentShare
    {
        if ((int) $client->organization_id !== (int) $document->organization_id) {
            throw ValidationException::withMessages(['client_id' => __('The client must belong to this organization.')]);
        }

        if ($document->is_confidential) {
            throw ValidationException::withMessages(['client_id' => __('Confidential documents cannot be shared with clients. Remove the confidential flag first.')]);
        }

        $share = $document->shares()->create([
            'client_id' => $client->id,
            'can_download' => $canDownload,
            'expires_at' => $expiresAt,
            'shared_by' => $by->id,
        ]);

        $this->log($document, null, $by, 'share');

        return $share;
    }

    public function revoke(DocumentShare $share, User $by): void
    {
        $share->forceFill(['revoked_at' => now()])->save();
        $this->log($share->document, null, $by, 'revoke');
    }

    public function log(Document $document, ?DocumentVersion $version, ?User $user, string $action): void
    {
        DocumentAccessLog::create([
            'document_id' => $document->id,
            'document_version_id' => $version?->id,
            'user_id' => $user?->id,
            'action' => $action,
            'ip_address' => request()?->ip(),
        ]);
    }

    /** Rejects files whose real (sniffed) MIME type is not on the allow-list. */
    private function assertSafe(UploadedFile $file): void
    {
        if (! in_array($file->getMimeType(), self::MIMES, true)) {
            throw ValidationException::withMessages(['file' => __('This file type is not allowed.')]);
        }
    }
}
