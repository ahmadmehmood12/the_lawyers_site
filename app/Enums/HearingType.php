<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum HearingType: string
{
    use HasOptions;

    case Regular = 'regular';
    case Preliminary = 'preliminary';
    case Evidence = 'evidence';
    case Arguments = 'arguments';
    case Judgment = 'judgment';
    case Bail = 'bail';
    case Interim = 'interim';
    case Miscellaneous = 'misc';

    public static function translationGroup(): string
    {
        return 'hearing_type';
    }
}
