<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum HearingStatus: string
{
    use HasOptions;

    case Scheduled = 'scheduled';
    case Held = 'held';
    case Adjourned = 'adjourned';
    case Rescheduled = 'rescheduled';
    case Cancelled = 'cancelled';

    public static function translationGroup(): string
    {
        return 'hearing_status';
    }
}
