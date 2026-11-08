<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum FeedbackCategory: string
{
    use HasOptions;

    case General = 'general';
    case Problem = 'problem';
    case Suggestion = 'suggestion';
    case Billing = 'billing';
    case Account = 'account';
    case Complaint = 'complaint';

    public static function translationGroup(): string
    {
        return 'feedback_category';
    }
}
