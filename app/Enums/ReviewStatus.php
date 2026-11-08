<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum ReviewStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public static function translationGroup(): string
    {
        return 'review_status';
    }
}
