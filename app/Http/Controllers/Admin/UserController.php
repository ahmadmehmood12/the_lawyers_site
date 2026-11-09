<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountType;
use App\Enums\PlatformRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PublicFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        [$sort, $direction] = $this->sorting(['name', 'email', 'created_at', 'last_login_at'], 'created_at');

        $users = User::query()->with('roles:id,name')
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")))
            ->when($request->string('type')->toString(), fn ($q, $t) => $q->where('account_type', $t))
            ->when($request->string('status')->toString(), fn ($q, $s) => $q->where('status', $s))
            ->when($request->boolean('deletion'), fn ($q) => $q->whereNotNull('deletion_requested_at'))
            ->orderBy($sort, $direction)->orderByDesc('id')->paginate(25)->withQueryString()
            ->through(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'avatar_url' => PublicFile::url($u->avatar_path),
                'account_type' => $u->account_type->value, 'account_type_label' => $u->account_type->label(),
                'status' => $u->status->value, 'status_label' => $u->status->label(), 'roles' => $u->roles->pluck('name'),
                'created_at' => $u->created_at->toIso8601String(), 'last_login_at' => $u->last_login_at?->toIso8601String(),
                'deletion_requested' => $u->deletion_requested_at !== null,
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'type', 'status', 'deletion', 'sort', 'direction']),
            'options' => ['types' => AccountType::options(), 'statuses' => UserStatus::options(), 'roles' => self::roleOptions()],
            'can' => ['manage' => $request->user()->can('users.manage') || $request->user()->isSuperAdmin(), 'suspend' => $request->user()->can('users.suspend') || $request->user()->isSuperAdmin(), 'roles' => $request->user()->can('roles.manage') || $request->user()->isSuperAdmin()],
        ]);
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->can('users.suspend') || $request->user()->isSuperAdmin(), 403);
        abort_if($user->id === $request->user()->id || $user->isSuperAdmin(), 422, __('This account cannot be changed here.'));
        $validated = $request->validate(['status' => ['required', Rule::enum(UserStatus::class)], 'reason' => ['nullable', 'required_unless:status,active', 'string', 'max:255']]);

        $user->forceFill([
            'status' => $validated['status'],
            'suspended_at' => $validated['status'] === 'active' ? null : now(),
            'suspension_reason' => $validated['status'] === 'active' ? null : $validated['reason'],
        ])->save();
        activity('admin')->causedBy($request->user())->performedOn($user)->withProperties($validated)->log('user_status_changed');

        return back()->with('success', __('Account status updated.'));
    }

    /** Built-in and custom platform roles as select options. @return list<array{value: string, label: string}> */
    private static function roleOptions(): array
    {
        return Role::query()->where('guard_name', 'web')->orderBy('id')->pluck('name')
            ->map(fn (string $name) => ['value' => $name, 'label' => PlatformRole::tryFrom($name)?->label() ?? Str::headline($name)])->all();
    }

    /** Only super admins assign platform roles; roles apply to platform-staff accounts only. */
    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        abort_unless($user->isPlatformStaff(), 422, __('Platform roles can only be given to platform staff accounts.'));
        abort_if($user->id === $request->user()->id, 422, __('You cannot change your own roles.'));
        $validated = $request->validate(['roles' => ['array'], 'roles.*' => [Rule::exists('roles', 'name')->where('guard_name', 'web')]]);

        $user->syncRoles($validated['roles'] ?? []);
        activity('admin')->causedBy($request->user())->performedOn($user)->withProperties(['roles' => $validated['roles'] ?? []])->log('roles_changed');

        return back()->with('success', __('Roles updated.'));
    }

    public function storeStaff(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        $user = User::query()->forceCreate(['name' => $validated['name'], 'email' => strtolower($validated['email']), 'password' => str()->random(40), 'account_type' => AccountType::Platform]);
        $user->assignRole($validated['role']);
        Password::sendResetLink(['email' => $user->email]);
        activity('admin')->causedBy($request->user())->performedOn($user)->withProperties(['role' => $validated['role']])->log('staff_created');

        return back()->with('success', __('Staff account created. A password setup link was emailed.'));
    }
}
