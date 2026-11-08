<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        $user = User::factory()->platform()->create();
        $user->assignRole('super-admin');

        return $user;
    }

    public function test_super_admin_creates_a_custom_role_and_assigns_it_to_staff(): void
    {
        $superAdmin = $this->superAdmin();

        $this->actingAs($superAdmin)->post(route('admin.roles.store'), ['name' => 'Content Editor', 'permissions' => ['content.moderate', 'templates.manage']])
            ->assertRedirect()->assertSessionHasNoErrors();

        $role = Role::findByName('content-editor', 'web');
        $this->assertEqualsCanonicalizing(['content.moderate', 'templates.manage'], $role->permissions->pluck('name')->all());

        $staff = User::factory()->platform()->create();
        $this->actingAs($superAdmin)->put(route('admin.users.roles', $staff), ['roles' => ['content-editor']])->assertSessionHasNoErrors();
        $this->assertTrue($staff->fresh()->can('content.moderate'));
        $this->assertFalse($staff->fresh()->can('settings.manage'));
    }

    public function test_unknown_permissions_are_rejected(): void
    {
        $this->actingAs($this->superAdmin())->post(route('admin.roles.store'), ['name' => 'odd', 'permissions' => ['cases.view_all']])
            ->assertSessionHasErrors('permissions.0');
    }

    public function test_super_admin_role_is_locked_and_built_in_roles_cannot_be_deleted(): void
    {
        $superAdmin = $this->superAdmin();

        $this->actingAs($superAdmin)->put(route('admin.roles.update', Role::findByName('super-admin', 'web')), ['permissions' => []])->assertForbidden();
        $this->actingAs($superAdmin)->delete(route('admin.roles.destroy', Role::findByName('support', 'web')))->assertForbidden();

        $support = Role::findByName('support', 'web');
        $this->actingAs($superAdmin)->put(route('admin.roles.update', $support), ['name' => 'renamed', 'permissions' => ['support.manage']])->assertSessionHasNoErrors();
        $this->assertSame('support', $support->fresh()->name);
        $this->assertSame(['support.manage'], $support->fresh()->permissions->pluck('name')->all());
    }

    public function test_a_role_in_use_cannot_be_deleted(): void
    {
        $superAdmin = $this->superAdmin();
        $role = Role::create(['name' => 'auditor', 'guard_name' => 'web']);
        User::factory()->platform()->create()->assignRole($role);

        $this->actingAs($superAdmin)->delete(route('admin.roles.destroy', $role))->assertStatus(422);
        $this->assertModelExists($role);
    }

    public function test_admins_without_roles_permission_cannot_manage_roles(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->get(route('admin.roles.index'))->assertForbidden();
        $this->actingAs($admin)->post(route('admin.roles.store'), ['name' => 'sneaky', 'permissions' => ['roles.manage']])->assertForbidden();
        $this->actingAs($this->lawyer())->get(route('admin.roles.index'))->assertForbidden();
    }
}
