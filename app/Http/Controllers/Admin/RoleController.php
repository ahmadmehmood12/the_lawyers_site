<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PlatformRole;
use App\Http\Controllers\Controller;
use Database\Seeders\PlatformRolesSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Platform staff roles (Admin, Roles and permissions; requires roles.manage).
 * Built-in roles keep their names and cannot be deleted; Super Admin always holds
 * every permission. Firm roles are separate (config/legal.php).
 */
class RoleController extends Controller
{
    /** @return array<string, string> */
    public static function permissionLabels(): array
    {
        return [
            'users.view' => __('See user accounts'),
            'users.manage' => __('Create and edit user accounts'),
            'users.suspend' => __('Suspend and reactivate accounts'),
            'roles.manage' => __('Manage roles and permissions'),
            'verification.review' => __('Review lawyer verification'),
            'verification.decide' => __('Approve or reject verification'),
            'organizations.view' => __('See organizations'),
            'organizations.manage' => __('Manage organizations'),
            'reference.manage' => __('Manage courts, judges and reference data'),
            'templates.manage' => __('Manage drafting templates'),
            'content.moderate' => __('Moderate articles, reviews and pages'),
            'support.manage' => __('Handle feedback, contact messages and complaints'),
            'billing.view' => __('See plans and subscriptions'),
            'billing.manage' => __('Manage plans and subscriptions'),
            'settings.manage' => __('Change platform settings, email and WhatsApp'),
            'audit.view' => __('Read the audit log'),
            'reports.view' => __('See platform reports'),
            'exports.run' => __('Export data'),
        ];
    }

    public function index(): Response
    {
        $builtIn = PlatformRole::values();

        return Inertia::render('Admin/Roles', [
            'roles' => Role::query()->where('guard_name', 'web')->with('permissions:id,name')->withCount('users')->orderBy('id')->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'label' => in_array($role->name, $builtIn, true) ? PlatformRole::from($role->name)->label() : Str::headline($role->name),
                    'built_in' => in_array($role->name, $builtIn, true),
                    'locked' => $role->name === PlatformRole::SuperAdmin->value,
                    'permissions' => $role->permissions->pluck('name')->values(),
                    'users_count' => $role->users_count,
                ]),
            'permissions' => collect(self::permissionLabels())->map(fn ($label, $name) => ['value' => $name, 'label' => $label, 'group' => Str::before($name, '.')])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);
        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'web']);
        $role->syncPermissions($validated['permissions'] ?? []);
        $this->audit($request, $role, 'role_saved');

        return back()->with('success', __('Role created.'));
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->name === PlatformRole::SuperAdmin->value, 403, __('The Super Admin role always has every permission.'));
        $builtIn = in_array($role->name, PlatformRole::values(), true);
        $validated = $this->validated($request, $role, $builtIn);

        if (! $builtIn) {
            $role->update(['name' => $validated['name']]);
        }
        $role->syncPermissions($validated['permissions'] ?? []);
        $this->audit($request, $role, 'role_saved');

        return back()->with('success', __('Role saved.'));
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        abort_if(in_array($role->name, PlatformRole::values(), true), 403, __('Built-in roles cannot be deleted.'));
        abort_if($role->users()->exists(), 422, __('Remove this role from its users before deleting it.'));

        activity('admin')->causedBy($request->user())->withProperties(['role' => $role->name])->log('role_deleted');
        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return back()->with('success', __('Role deleted.'));
    }

    /** @return array{name: string, permissions?: list<string>} */
    private function validated(Request $request, ?Role $role = null, bool $builtIn = false): array
    {
        $request->merge(['name' => Str::slug((string) $request->input('name', $role?->name))]);

        return $request->validate([
            'name' => $builtIn ? ['nullable'] : ['required', 'string', 'min:3', 'max:40', Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($role?->id)],
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::in(PlatformRolesSeeder::PERMISSIONS)],
        ]);
    }

    private function audit(Request $request, Role $role, string $event): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        activity('admin')->causedBy($request->user())->performedOn($role)->withProperties(['role' => $role->name, 'permissions' => $role->permissions()->pluck('name')])->log($event);
    }
}
