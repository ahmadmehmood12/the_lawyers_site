<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum Priority: string
{
    use HasOptions;

    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Urgent = 'urgent';

    public static function translationGroup(): string
    {
        return 'priority';
    }
}
