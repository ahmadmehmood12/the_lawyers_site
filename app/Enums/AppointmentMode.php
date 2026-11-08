<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AppointmentMode: string
{
    use HasOptions;

    case InPerson = 'in_person';
    case Online = 'online';

    public static function translationGroup(): string
    {
        return 'appointment_mode';
    }
}
