<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum Recurrence: string
{
    use HasOptions;

    case None = 'none';
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';

    public static function translationGroup(): string
    {
        return 'recurrence';
    }
}
