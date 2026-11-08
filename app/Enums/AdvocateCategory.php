<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AdvocateCategory: string
{
    use HasOptions;

    case LowerCourts = 'lower_courts';
    case HighCourt = 'high_court';
    case SupremeCourt = 'supreme_court';

    public static function translationGroup(): string
    {
        return 'advocate_category';
    }
}
