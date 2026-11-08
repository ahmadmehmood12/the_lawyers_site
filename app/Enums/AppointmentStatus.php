<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AppointmentStatus: string
{
    use HasOptions;

    case Requested = 'requested';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Declined = 'declined';
    case NoShow = 'no_show';

    public static function translationGroup(): string
    {
        return 'appointment_status';
    }
}
