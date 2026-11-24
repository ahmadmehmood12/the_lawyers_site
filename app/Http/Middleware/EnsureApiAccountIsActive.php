<?php

namespace App\Http\Middleware;

use App\Services\Messaging\MessagingService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * API twin of EnsureAccountIsActive: a suspended user's token is revoked and the request is
 * refused, exactly as the web session is logged out.
 */
class EnsureApiAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isSuspended()) {
            $user->currentAccessToken()?->delete();
            abort(403, __('Your account has been suspended. Please contact support.'));
        }

        // Like the web (HandleInertiaRequests): an active app session counts as "received", so the
        // sender sees the grey double tick. At most one write per 20 seconds per user.
        if ($user && Cache::add('delivered-ping:'.$user->id, 1, 20)) {
            app(MessagingService::class)->markDelivered($user);
        }

        return $next($request);
    }
}
