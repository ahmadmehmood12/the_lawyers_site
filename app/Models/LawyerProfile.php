<?php

namespace App\Models;

use App\Enums\AdvocateCategory;
use App\Enums\ReviewStatus;
use App\Enums\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id', 'slug', 'title', 'cnic', 'bar_council_id', 'enrollment_number', 'advocate_category', 'enrollment_date',
    'practice_since', 'headline', 'bio', 'bio_ur', 'photo_path', 'province_id', 'district_id', 'city_id',
    'chamber_address', 'public_phone', 'public_email', 'consultation_fee_min', 'consultation_fee_max',
    'offers_online', 'offers_in_person', 'accepting_clients', 'is_public', 'onboarding_step',
])]
#[Hidden(['cnic'])]
class LawyerProfile extends Model
{
    use HasFactory;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['verification_status' => 'unverified', 'onboarding_step' => 1, 'offers_online' => false, 'offers_in_person' => true, 'accepting_clients' => true, 'is_public' => false, 'rating_average' => 0, 'rating_count' => 0];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cnic' => 'encrypted',
            'advocate_category' => AdvocateCategory::class,
            'verification_status' => VerificationStatus::class,
            'enrollment_date' => 'date',
            'verified_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'offers_online' => 'boolean',
            'offers_in_person' => 'boolean',
            'accepting_clients' => 'boolean',
            'is_public' => 'boolean',
            'rating_average' => 'decimal:2',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function barCouncil(): BelongsTo
    {
        return $this->belongsTo(BarCouncil::class);
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function specializations(): BelongsToMany
    {
        return $this->belongsToMany(Specialization::class, 'lawyer_specialization')->withPivot('is_primary');
    }

    public function courts(): BelongsToMany
    {
        return $this->belongsToMany(Court::class, 'court_lawyer_profile');
    }

    public function languages(): HasMany
    {
        return $this->hasMany(LawyerLanguage::class);
    }

    public function educations(): HasMany
    {
        return $this->hasMany(LawyerEducation::class)->orderByDesc('year');
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(LawyerExperience::class)->orderByDesc('start_year');
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(LawyerCredential::class)->orderByDesc('year');
    }

    public function verificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class);
    }

    public function latestVerificationRequest(): HasOne
    {
        return $this->hasOne(VerificationRequest::class)->latestOfMany();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function approvedReviews(): HasMany
    {
        return $this->reviews()->where('status', ReviewStatus::Approved->value);
    }

    public function isVerified(): bool
    {
        return $this->verification_status === VerificationStatus::Approved;
    }

    public function yearsOfExperience(): ?int
    {
        return $this->practice_since ? max(0, (int) now()->year - $this->practice_since) : null;
    }

    /** Profiles visible in the public directory: published by the lawyer and not suspended. */
    #[Scope]
    protected function listed(Builder $query): void
    {
        $query->where('is_public', true)
            ->whereNotIn('verification_status', [VerificationStatus::Suspended->value, VerificationStatus::Rejected->value])
            ->whereHas('user', fn (Builder $q) => $q->where('status', 'active'));
    }
}
