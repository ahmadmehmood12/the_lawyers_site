<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum SupportMessageStatus: string
{
    use HasOptions;

    case New = 'new';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';

    public static function translationGroup(): string
    {
        return 'support_status';
    }
}
