<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Admin\PlatformController;
use App\Models\Setting;
use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Services\Messaging\MessagingService;
use App\Support\PublicFile;
use App\Support\Translations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
        // Delivery receipts: an active session counts as "received" (throttled to one write per 20 s).
        if ($user && Cache::add('delivered-ping:'.$user->id, 1, 20)) {
            app(MessagingService::class)->markDelivered($user);
        }
        $logoPath = Setting::get('site_logo_path');
        $faviconPath = Setting::get('site_favicon_path');
        $avatarPath = $user?->avatar_path;

        return [
            ...parent::share($request),
            'app' => [
                'name' => Setting::get('site_name') ?: config('app.name'),
                'tagline' => Setting::get('site_tagline') ?: '',
                'logo_url' => PublicFile::url($logoPath),
                'favicon_url' => PublicFile::url($faviconPath),
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
            // Sign-in / sign-up promotional panel, only on the auth pages (Admin, Settings, Sign-in page).
            'authMedia' => $request->routeIs('login', 'register', 'password.request', 'password.reset', 'two-factor.login', 'verification.notice', 'password.confirm', 'invitations.show')
                ? fn () => PlatformController::authMedia()
                : null,
            'translations' => Inertia::once(fn () => Translations::forLocale($locale))->as('translations-'.$locale),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar_url' => PublicFile::url($avatarPath),
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
                    'logo_url' => PublicFile::url($organization->logo_path),
                    'role' => $access->role($user, $organization)?->value,
                    'permissions' => $access->permissions($user, $organization),
                ] : null,
                'organizations' => fn () => $user?->isProfessional()
                    ? $user->organizations()->get(['organizations.id', 'organizations.name', 'organizations.type'])->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])
                    : [],
            ],
            'unread' => fn () => $user ? [
                'notifications' => $user->unreadNotifications()->count(),
                'messages' => app(MessagingService::class)->totalUnread($user),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
