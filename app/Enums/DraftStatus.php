<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DraftStatus: string
{
    use HasOptions;

    case Draft = 'draft';
    case InReview = 'in_review';
    case Approved = 'approved';

    public static function translationGroup(): string
    {
        return 'draft_status';
    }
}
