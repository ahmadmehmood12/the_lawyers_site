<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum Attendance: string
{
    use HasOptions;

    case Present = 'present';
    case Absent = 'absent';
    case Proxy = 'proxy';
    case NotRequired = 'not_required';

    public static function translationGroup(): string
    {
        return 'attendance';
    }
}
