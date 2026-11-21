<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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

        return $next($request);
    }
}
