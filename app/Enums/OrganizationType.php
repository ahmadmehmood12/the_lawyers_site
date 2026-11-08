<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum OrganizationType: string
{
    use HasOptions;

    case Solo = 'solo';
    case Firm = 'firm';

    public static function translationGroup(): string
    {
        return 'organization_type';
    }
}
