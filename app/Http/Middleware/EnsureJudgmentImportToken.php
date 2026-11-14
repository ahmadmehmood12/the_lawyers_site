<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protects the scraper import endpoint with a bearer token kept in
 * JUDGMENTS_IMPORT_TOKEN. A blank configured token keeps the endpoint closed.
 */
class EnsureJudgmentImportToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = trim((string) config('services.judgments.import_token'));
        $provided = trim((string) $request->bearerToken());

        if ($expected === '' || $provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
