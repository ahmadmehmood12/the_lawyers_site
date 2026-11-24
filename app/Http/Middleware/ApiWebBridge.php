<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mobile API routes that run the web controller action itself (routes/api/v1.php "web" section).
 * Gives the request the session store the web code flashes its success/error messages into, makes
 * $request->user() resolve the Sanctum token, and marks the request so Controller::callAction()
 * returns JSON (App\Support\ApiBridge) instead of a redirect / Inertia page.
 */
class ApiWebBridge
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('api_bridge', true);
        Auth::shouldUse('sanctum');

        if (! $request->hasSession()) {
            $request->setLaravelSession(app('session.store'));
        }

        return $next($request);
    }
}
