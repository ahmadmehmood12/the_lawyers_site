<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AccountType: string
{
    use HasOptions;

    case Lawyer = 'lawyer';
    case Client = 'client';
    case Staff = 'staff';
    case Platform = 'platform';

    public static function translationGroup(): string
    {
        return 'account_type';
    }
}
