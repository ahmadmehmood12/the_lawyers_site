<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/** API twin of SetLocale: the signed-in user's language, else the Accept-Language header (en/ur). */
class SetApiLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->user('sanctum')?->locale ?? $request->getPreferredLanguage(SetLocale::SUPPORTED);

        if (! in_array($locale, SetLocale::SUPPORTED, true)) {
            $locale = config('app.locale');
        }

        app()->setLocale($locale);
        Carbon::setLocale($locale);

        return $next($request);
    }
}
