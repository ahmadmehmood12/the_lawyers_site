<?php

namespace App\Http\Middleware;

use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Support\Translations;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Shared props. Keep this lean: only what every layout needs. Never put
     * confidential case data here. See docs/Architecture/Frontend-Architecture.md.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $locale = app()->getLocale();
        $organization = $user?->isProfessional() ? app(CurrentOrganization::class)->for($user) : null;
        $access = app(OrganizationAccess::class);

        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name'),
                'locale' => $locale,
                'dir' => $locale === 'ur' ? 'rtl' : 'ltr',
                'locales' => ['en' => 'English', 'ur' => 'اردو'],
            ],
            'translations' => Inertia::once(fn () => Translations::forLocale($locale))->as('translations-'.$locale),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'account_type' => $user->account_type->value,
                    'locale' => $user->locale,
                    'theme' => $user->theme,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
                    'platform_roles' => $user->isPlatformStaff() ? $user->getRoleNames()->values() : [],
                    'platform_permissions' => $user->isPlatformStaff() ? $user->getAllPermissions()->pluck('name')->values() : [],
                    'lawyer_profile_slug' => $user->isLawyer() ? $user->lawyerProfile?->slug : null,
                ] : null,
                'organization' => $organization ? [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'type' => $organization->type->value,
                    'role' => $access->role($user, $organization)?->value,
                    'permissions' => $access->permissions($user, $organization),
                ] : null,
                'organizations' => fn () => $user?->isProfessional()
                    ? $user->organizations()->get(['organizations.id', 'organizations.name', 'organizations.type'])->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])
                    : [],
            ],
            'unread' => fn () => $user ? [
                'notifications' => $user->unreadNotifications()->count(),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
