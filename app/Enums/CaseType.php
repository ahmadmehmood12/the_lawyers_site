<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum CaseType: string
{
    use HasOptions;

    case Civil = 'civil';
    case Criminal = 'criminal';
    case Family = 'family';
    case Constitutional = 'constitutional';
    case Corporate = 'corporate';
    case Banking = 'banking';
    case Tax = 'tax';
    case Labour = 'labour';
    case Property = 'property';
    case Rent = 'rent';
    case Service = 'service';
    case Consumer = 'consumer';
    case Cyber = 'cyber';
    case Other = 'other';

    public static function translationGroup(): string
    {
        return 'case_type';
    }
}
