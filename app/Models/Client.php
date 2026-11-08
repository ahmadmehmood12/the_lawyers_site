<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['organization_id', 'user_id', 'type', 'name', 'company_name', 'cnic', 'ntn', 'email', 'phone', 'whatsapp', 'address', 'city_id', 'preferred_locale', 'notes', 'created_by'])]
#[Hidden(['cnic', 'notes'])]
class Client extends Model
{
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['type' => 'individual', 'preferred_locale' => 'en'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cnic' => 'encrypted',
            'notes' => 'encrypted',
            'whatsapp_consent_at' => 'datetime',
            'whatsapp_consent_revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function cases(): BelongsToMany
    {
        return $this->belongsToMany(LegalCase::class, 'case_client')->withPivot('is_primary')->withTimestamps();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function hasWhatsAppConsent(): bool
    {
        return $this->whatsapp_consent_at !== null && $this->whatsapp_consent_revoked_at === null;
    }

    public function whatsAppNumber(): ?string
    {
        return $this->whatsapp ?: $this->phone;
    }

    /** CNIC masked for display without the sensitive permission, e.g. 35202-*******-1. */
    public function maskedCnic(): ?string
    {
        $cnic = $this->cnic;

        return $cnic ? substr($cnic, 0, 5).'-*******-'.substr($cnic, -1) : null;
    }
}
