<?php

namespace App\Models;

use App\Enums\PlanPaymentStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A request to buy or renew a plan. Manual requests carry the uploaded
 * screenshot and are approved by an admin; Stripe requests are completed by
 * the signed webhook. Paid rows are immutable proof of the transaction.
 */
#[Fillable(['organization_id', 'user_id', 'plan_id', 'payment_method_id', 'billing_cycle', 'amount', 'currency', 'status', 'account_email', 'reference', 'screenshot_path', 'notes', 'admin_notes', 'provider', 'provider_reference', 'paid_at', 'verified_at', 'verified_by'])]
class PlanPayment extends Model
{
    use BelongsToOrganization;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'status' => PlanPaymentStatus::class,
            'paid_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isStripe(): bool
    {
        return $this->provider === 'stripe';
    }
}
