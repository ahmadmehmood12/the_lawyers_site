<?php

namespace App\Models;

use App\Enums\DraftStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['organization_id', 'legal_case_id', 'client_id', 'document_template_id', 'title', 'language', 'body', 'header_text', 'footer_text', 'status', 'version', 'reviewed_by', 'approved_at', 'created_by'])]
class Draft extends Model
{
    use BelongsToOrganization, LogsActivity, SoftDeletes;

    /** Activity feed entry; only non-sensitive fields are recorded (docs/Modules/Activity-Feed.md). */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->useLogName('drafts')->logOnly(['status', 'version'])->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'draft', 'version' => 1, 'language' => 'en'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => DraftStatus::class,
            'approved_at' => 'datetime',
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

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'document_template_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DraftVersion::class)->orderByDesc('version');
    }
}
