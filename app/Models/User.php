<?php

namespace App\Models;

use App\Enums\AccountType;
use App\Enums\MembershipStatus;
use App\Enums\PlatformRole;
use App\Enums\UserStatus;
use App\Services\Auth\OneTimeCodeService;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'phone', 'avatar_path', 'password', 'account_type', 'locale', 'theme', 'referral_code', 'coupon_code'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'active', 'locale' => 'en', 'theme' => 'system'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'account_type' => AccountType::class,
            'status' => UserStatus::class,
        ];
    }

    public function lawyerProfile(): HasOne
    {
        return $this->hasOne(LawyerProfile::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_members')
            ->withPivot(['role', 'status'])
            ->wherePivot('status', MembershipStatus::Active->value)
            ->withTimestamps();
    }

    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    /** Client records (one per organization) linked to this portal account. */
    public function clientRecords(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function availabilitySlots(): HasMany
    {
        return $this->hasMany(AvailabilitySlot::class);
    }

    public function unavailableDates(): HasMany
    {
        return $this->hasMany(UnavailableDate::class);
    }

    public function favouriteLawyers(): BelongsToMany
    {
        return $this->belongsToMany(LawyerProfile::class, 'favourite_lawyers');
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    public function isPlatformStaff(): bool
    {
        return $this->account_type === AccountType::Platform;
    }

    public function isClient(): bool
    {
        return $this->account_type === AccountType::Client;
    }

    public function isProfessional(): bool
    {
        return in_array($this->account_type, [AccountType::Lawyer, AccountType::Staff], true);
    }

    public function isLawyer(): bool
    {
        return $this->account_type === AccountType::Lawyer;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(PlatformRole::SuperAdmin->value);
    }

    public function isSuspended(): bool
    {
        return $this->status !== UserStatus::Active;
    }

    /** Preferred locale used for notifications and mail. */
    /** Emails and notifications are written in the person's chosen language (English when unset). */
    public function preferredLocale(): string
    {
        return in_array($this->locale, ['en', 'ur'], true) ? $this->locale : 'en';
    }

    /** E.164-ish WhatsApp number for notifications, when the user has one. */
    public function routeNotificationForWhatsApp(): ?string
    {
        return $this->phone;
    }

    /** Sends a six-digit code instead of a signed link (OneTimeCodeService). */
    public function sendEmailVerificationNotification(): void
    {
        app(OneTimeCodeService::class)->send($this, OneTimeCodeService::VerifyEmail);
    }

    /** Sends a six-digit reset code; the broker token is issued only after the code is checked. */
    public function sendPasswordResetNotification($token): void
    {
        app(OneTimeCodeService::class)->send($this, OneTimeCodeService::ResetPassword);
    }
}
