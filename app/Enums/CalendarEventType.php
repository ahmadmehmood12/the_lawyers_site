<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Types a user can create directly. Hearings, appointments, tasks and diary notes come from their own modules. */
enum CalendarEventType: string
{
    use HasOptions;

    case Meeting = 'meeting';
    case Consultation = 'consultation';
    case CourtVisit = 'court_visit';
    case Deadline = 'deadline';
    case Reminder = 'reminder';
    case Personal = 'personal';
    case Other = 'other';

    public static function translationGroup(): string
    {
        return 'calendar_event_type';
    }
}
