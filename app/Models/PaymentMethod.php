<?php

namespace App\Models;

use App\Enums\PaymentMethodKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A way to pay for a plan. Stripe methods start an online checkout; manual
 * methods (bank transfer, SadaPay, NayaPay…) show the configured details and
 * ask for a payment screenshot. Admins enable, disable and add methods.
 */
#[Fillable(['key', 'name', 'kind', 'is_enabled', 'instructions', 'details', 'sort_order'])]
class PaymentMethod extends Model
{
    /** @var array<string, mixed> */
    protected $attributes = ['kind' => 'manual', 'is_enabled' => false, 'sort_order' => 0];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => PaymentMethodKind::class,
            'is_enabled' => 'boolean',
            'details' => 'array',
            'sort_order' => 'integer',
        ];
    }

    #[Scope]
    protected function enabled(Builder $query): void
    {
        $query->where('is_enabled', true)->orderBy('sort_order')->orderBy('name');
    }

    public function isStripe(): bool
    {
        return $this->kind === PaymentMethodKind::Stripe;
    }
}
