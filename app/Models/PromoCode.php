<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Referral and coupon codes entered at registration. A code is only valid
 * while it is active, has not expired and has uses remaining.
 */
#[Fillable(['code', 'type', 'description', 'discount_percent', 'bonus_trial_days', 'max_uses', 'uses', 'is_active', 'expires_at'])]
class PromoCode extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public static function normalize(?string $code): string
    {
        return strtoupper(trim((string) $code));
    }

    public static function findUsable(?string $code, string $type): ?self
    {
        $code = self::normalize($code);

        if ($code === '') {
            return null;
        }

        return static::query()
            ->where('code', $code)
            ->where('type', $type)
            ->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn (Builder $q) => $q->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
            ->first();
    }

    public function redeem(): void
    {
        $this->increment('uses');
    }
}
