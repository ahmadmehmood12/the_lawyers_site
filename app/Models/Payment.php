<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use LogicException;

/**
 * Payments are immutable once confirmed: corrections are made with refunds.
 * See docs/Modules/Finance-and-Receipts.md.
 */
#[Fillable(['organization_id', 'invoice_id', 'client_id', 'receipt_number', 'amount', 'method', 'reference', 'paid_on', 'status', 'provider', 'provider_reference', 'verified_at', 'idempotency_key', 'notes', 'received_by'])]
class Payment extends Model
{
    use BelongsToOrganization;

    protected static function booted(): void
    {
        static::updating(function (Payment $payment): void {
            if ($payment->getOriginal('status') === PaymentStatus::Confirmed->value || $payment->getOriginal('status') === PaymentStatus::Confirmed) {
                throw new LogicException('Confirmed payments are immutable. Record a refund instead.');
            }
        });

        static::deleting(function (): void {
            throw new LogicException('Payments cannot be deleted.');
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_on' => 'date',
            'verified_at' => 'datetime',
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function refundedAmount(): string
    {
        return number_format((float) $this->refunds()->sum('amount'), 2, '.', '');
    }
}
