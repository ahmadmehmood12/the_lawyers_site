<?php

use App\Enums\PlatformRole;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Platform permission for the admin Analytics dashboard, given to Super Admin and Admin only
 * (existing databases; fresh installs get it from PlatformRolesSeeder).
 */
return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $permission = Permission::findOrCreate('analytics.platform', 'web');

        foreach ([PlatformRole::SuperAdmin->value, PlatformRole::Admin->value] as $name) {
            Role::query()->where('name', $name)->where('guard_name', 'web')->first()?->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::query()->where('name', 'analytics.platform')->where('guard_name', 'web')->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
