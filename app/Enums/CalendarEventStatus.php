<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum CalendarEventStatus: string
{
    use HasOptions;

    case Scheduled = 'scheduled';
    case Rescheduled = 'rescheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public static function translationGroup(): string
    {
        return 'calendar_event_status';
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Scheduled, self::Rescheduled], true);
    }
}
