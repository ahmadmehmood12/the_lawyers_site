<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum VerificationStatus: string
{
    use HasOptions;

    case Unverified = 'unverified';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case InformationRequested = 'information_requested';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    public static function translationGroup(): string
    {
        return 'verification_status';
    }
}
