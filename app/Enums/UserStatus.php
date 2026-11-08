<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum UserStatus: string
{
    use HasOptions;

    case Active = 'active';
    case Suspended = 'suspended';
    case Deactivated = 'deactivated';

    public static function translationGroup(): string
    {
        return 'user_status';
    }
}
