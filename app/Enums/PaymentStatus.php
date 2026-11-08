<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PaymentStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Failed = 'failed';

    public static function translationGroup(): string
    {
        return 'payment_status';
    }
}
