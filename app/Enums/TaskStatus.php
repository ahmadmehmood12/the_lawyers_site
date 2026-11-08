<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum TaskStatus: string
{
    use HasOptions;

    case Open = 'open';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Cancelled = 'cancelled';

    public static function translationGroup(): string
    {
        return 'task_status';
    }
}
