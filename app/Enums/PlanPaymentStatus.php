<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PlanPaymentStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case AwaitingVerification = 'awaiting_verification';
    case Paid = 'paid';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
    case Failed = 'failed';

    public static function translationGroup(): string
    {
        return 'plan_payment_status';
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::AwaitingVerification], true);
    }
}
