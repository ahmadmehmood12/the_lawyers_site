<?php

namespace Database\Seeders;

use App\Enums\PlatformRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Platform staff permissions (Spatie, global). Organization permissions are
 * separate — see config/legal.php and docs/Architecture/Authorization.md.
 * A "view" permission never implies manage/approve.
 */
class PlatformRolesSeeder extends Seeder
{
    /** @var list<string> */
    public const PERMISSIONS = [
        'users.view', 'users.manage', 'users.suspend', 'roles.manage',
        'verification.review', 'verification.decide',
        'organizations.view', 'organizations.manage',
        'reference.manage', 'templates.manage',
        'content.moderate', 'support.manage',
        'billing.view', 'billing.manage',
        'settings.manage', 'audit.view', 'reports.view', 'exports.run',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $matrix = [
            PlatformRole::SuperAdmin->value => self::PERMISSIONS,
            PlatformRole::Admin->value => array_values(array_diff(self::PERMISSIONS, ['roles.manage'])),
            PlatformRole::VerificationOfficer->value => ['verification.review', 'verification.decide', 'users.view', 'organizations.view'],
            PlatformRole::Support->value => ['users.view', 'organizations.view', 'support.manage', 'content.moderate'],
            PlatformRole::FinanceAdmin->value => ['billing.view', 'billing.manage', 'organizations.view', 'reports.view', 'exports.run'],
        ];

        foreach ($matrix as $role => $permissions) {
            Role::findOrCreate($role, 'web')->syncPermissions($permissions);
        }
    }
}
