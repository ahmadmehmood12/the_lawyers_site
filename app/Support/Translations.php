<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Loads UI strings from lang/{locale}.json for the React frontend.
 * The English key is the source string; missing Urdu keys fall back to English.
 */
class Translations
{
    /**
     * @return array<string, string>
     */
    public static function forLocale(string $locale): array
    {
        $path = lang_path($locale.'.json');

        if (! is_file($path)) {
            return [];
        }

        return Cache::remember('ui-translations:'.$locale.':'.filemtime($path), now()->addDay(), function () use ($path): array {
            return json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        });
    }
}
