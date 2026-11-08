<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum ComplaintStatus: string
{
    use HasOptions;

    case Open = 'open';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Dismissed = 'dismissed';

    public static function translationGroup(): string
    {
        return 'complaint_status';
    }
}
