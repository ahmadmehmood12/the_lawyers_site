<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('account:client') or 'account:lawyer,staff'.
 */
class EnsureAccountType
{
    public function handle(Request $request, Closure $next, string ...$types): Response
    {
        $type = $request->user()?->account_type?->value;

        abort_unless($type !== null && in_array($type, $types, true), 403);

        return $next($request);
    }
}
