<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Support\Translations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        $logoPath = Setting::get('site_logo_path');
        $faviconPath = Setting::get('site_favicon_path');
        $avatarPath = $user?->avatar_path;

        return [
            ...parent::share($request),
            'app' => [
                'name' => Setting::get('site_name') ?: config('app.name'),
                'tagline' => Setting::get('site_tagline') ?: '',
                'logo_url' => $logoPath ? Storage::disk('public')->url($logoPath) : null,
                'favicon_url' => $faviconPath ? Storage::disk('public')->url($faviconPath) : null,
                'social' => [
                    'facebook' => Setting::get('social_facebook') ?: null,
                    'instagram' => Setting::get('social_instagram') ?: null,
                    'youtube' => Setting::get('social_youtube') ?: null,
                    'linkedin' => Setting::get('social_linkedin') ?: null,
                    'x' => Setting::get('social_x') ?: null,
                    'whatsapp' => Setting::get('social_whatsapp') ?: null,
                ],
                'locale' => $locale,
                'dir' => $locale === 'ur' ? 'rtl' : 'ltr',
                'locales' => ['en' => 'English', 'ur' => 'اردو'],
                'site_theme' => Setting::get('site_theme', 'navy-gold') === 'white-green' ? 'white-green' : 'navy-gold',
            ],
            'translations' => Inertia::once(fn () => Translations::forLocale($locale))->as('translations-'.$locale),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar_url' => $avatarPath ? Storage::disk('public')->url($avatarPath) : null,
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
                    'logo_url' => $organization->logo_path ? Storage::disk('public')->url($organization->logo_path) : null,
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
