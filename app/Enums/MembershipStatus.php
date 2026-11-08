<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum MembershipStatus: string
{
    use HasOptions;

    case Active = 'active';
    case Suspended = 'suspended';
    case Removed = 'removed';

    public static function translationGroup(): string
    {
        return 'membership_status';
    }
}
