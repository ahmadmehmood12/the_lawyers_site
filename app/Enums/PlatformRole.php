<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Platform staff roles, stored with spatie/laravel-permission (global, no teams).
 */
enum PlatformRole: string
{
    use HasOptions;

    case SuperAdmin = 'super-admin';
    case Admin = 'admin';
    case VerificationOfficer = 'verification-officer';
    case Support = 'support';
    case FinanceAdmin = 'finance-admin';

    public static function translationGroup(): string
    {
        return 'platform_role';
    }
}
