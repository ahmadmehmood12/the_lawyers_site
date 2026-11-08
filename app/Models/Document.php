<?php

namespace App\Models;

use App\Enums\DocumentCategory;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['organization_id', 'legal_case_id', 'client_id', 'hearing_id', 'category', 'title', 'description', 'is_confidential', 'source', 'current_version_id', 'uploaded_by'])]
class Document extends Model
{
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['is_confidential' => false, 'source' => 'lawyer', 'category' => 'other'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => DocumentCategory::class,
            'is_confidential' => 'boolean',
        ];
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function hearing(): BelongsTo
    {
        return $this->belongsTo(Hearing::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version');
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'current_version_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(DocumentShare::class);
    }

    public function activeShares(): HasMany
    {
        return $this->shares()->whereNull('revoked_at')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(DocumentAccessLog::class)->latest('id');
    }
}
