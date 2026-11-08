<?php

namespace App\Models;

use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\Priority;
use App\Models\Concerns\BelongsToOrganization;
use App\Services\Access\OrganizationAccess;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable([
    'organization_id', 'reference', 'title', 'case_number', 'case_type', 'specialization_id', 'description', 'filing_date',
    'filing_year', 'court_id', 'jurisdiction', 'province_id', 'district_id', 'judge_id', 'judge_name', 'courtroom', 'status',
    'stage', 'priority', 'professional_fee', 'fee_type', 'fir_number', 'police_station', 'fir_date', 'legal_sections',
    'bail_status', 'investigation_notes', 'strategy_notes', 'client_summary', 'share_with_client', 'decided_on', 'outcome', 'created_by',
])]
#[Hidden(['investigation_notes', 'strategy_notes'])]
class LegalCase extends Model
{
    use BelongsToOrganization, HasFactory, LogsActivity, SoftDeletes;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'draft', 'priority' => 'normal', 'share_with_client' => true];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'case_type' => CaseType::class,
            'status' => CaseStatus::class,
            'priority' => Priority::class,
            'filing_date' => 'date',
            'fir_date' => 'date',
            'decided_on' => 'date',
            'next_hearing_at' => 'datetime',
            'archived_at' => 'datetime',
            'professional_fee' => 'decimal:2',
            'share_with_client' => 'boolean',
            'investigation_notes' => 'encrypted',
            'strategy_notes' => 'encrypted',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('cases')
            ->logOnly(['title', 'case_number', 'case_type', 'court_id', 'judge_name', 'status', 'stage', 'priority', 'professional_fee', 'share_with_client', 'archived_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function specialization(): BelongsTo
    {
        return $this->belongsTo(Specialization::class);
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function judge(): BelongsTo
    {
        return $this->belongsTo(Judge::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parties(): HasMany
    {
        return $this->hasMany(CaseParty::class)->orderBy('sort_order')->orderBy('id');
    }

    public function lawyers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'case_lawyer')->withPivot('role')->withTimestamps();
    }

    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'case_client')->withPivot('is_primary')->withTimestamps();
    }

    public function relatedCases(): BelongsToMany
    {
        return $this->belongsToMany(LegalCase::class, 'related_cases', 'legal_case_id', 'related_case_id')->withPivot('relation')->withTimestamps();
    }

    public function hearings(): HasMany
    {
        return $this->hasMany(Hearing::class);
    }

    public function nextHearing(): BelongsTo
    {
        return $this->belongsTo(Hearing::class, 'next_hearing_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(CaseExpense::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(CaseEvent::class);
    }

    public function drafts(): HasMany
    {
        return $this->hasMany(Draft::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function diaryEntries(): HasMany
    {
        return $this->hasMany(DiaryEntry::class);
    }

    public function isClosed(): bool
    {
        return $this->status->isClosed();
    }

    public function isAssignedTo(User $user): bool
    {
        if ($this->relationLoaded('lawyers')) {
            return $this->lawyers->contains('id', $user->id);
        }

        return $this->lawyers()->whereKey($user->id)->exists();
    }

    /**
     * Restrict to cases the user may see inside the organization: everything
     * with cases.view_all, otherwise only cases they are assigned to or have
     * a hearing assigned on.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user, Organization $organization): void
    {
        $query->forOrganization($organization);

        if (app(OrganizationAccess::class)->allows($user, $organization, 'cases.view_all')) {
            return;
        }

        $query->where(function (Builder $q) use ($user): void {
            $q->whereHas('lawyers', fn (Builder $l) => $l->whereKey($user->id))
                ->orWhereHas('hearings', fn (Builder $h) => $h->where('assigned_lawyer_id', $user->id));
        });
    }

    /** Cases a portal user may see: linked to one of their client records and shared. */
    #[Scope]
    protected function sharedWithClientUser(Builder $query, User $user): void
    {
        $query->where('share_with_client', true)
            ->whereHas('clients', fn (Builder $c) => $c->where('clients.user_id', $user->id));
    }
}
