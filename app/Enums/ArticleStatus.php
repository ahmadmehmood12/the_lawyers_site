<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum ArticleStatus: string
{
    use HasOptions;

    case Draft = 'draft';
    case Pending = 'pending';
    case Published = 'published';
    case Rejected = 'rejected';

    public static function translationGroup(): string
    {
        return 'article_status';
    }
}
