<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PaymentMethodKind: string
{
    use HasOptions;

    case Stripe = 'stripe';
    case Manual = 'manual';

    public static function translationGroup(): string
    {
        return 'payment_method_kind';
    }
}
