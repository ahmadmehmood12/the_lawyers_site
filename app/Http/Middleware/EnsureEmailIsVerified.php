<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces unverified accounts back to the verification notice on every
 * authenticated request, including full page loads typed directly into
 * the address bar (route-level `verified` only runs on routed groups).
 */
class EnsureEmailIsVerified
{
    /** Routes an unverified account still needs to reach to finish verifying or leave. */
    private const ALLOWED_ROUTES = [
        'verification.notice',
        'verification.verify',
        'verification.send',
        'verification.code',
        'logout',
        'locale.update',
        'theme.update',
        'password.confirm',
        'password.confirm.store',
        'password.confirmation',
        'two-factor.*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->hasVerifiedEmail()) {
            return $next($request);
        }

        if (! $this->routeRequiresAuthentication($request) || $request->routeIs(...self::ALLOWED_ROUTES)) {
            return $next($request);
        }

        return redirect()
            ->route('verification.notice')
            ->with('error', __('Sorry, you cannot view this page until you verify your email address.'));
    }

    private function routeRequiresAuthentication(Request $request): bool
    {
        foreach ($request->route()?->gatherMiddleware() ?? [] as $middleware) {
            if ($middleware === 'auth' || (is_string($middleware) && str_starts_with($middleware, 'auth:'))) {
                return true;
            }
        }

        return false;
    }
}
