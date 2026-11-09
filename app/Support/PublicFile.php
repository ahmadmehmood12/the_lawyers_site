<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Builds URLs for files on the public disk (photos, logos, branding).
 *
 * Root cause of the missing directory images: URLs were built from APP_URL
 * (Storage::url), so they broke whenever the site was opened on another host
 * or port. Local-disk files now resolve against the current request host, a
 * stored path whose file is gone returns null so the UI shows its fallback,
 * and cloud disks (S3 etc.) keep their own absolute URLs.
 */
class PublicFile
{
    public static function url(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $disk = Storage::disk('public');

        if (config('filesystems.disks.public.driver') !== 'local') {
            return $disk->url($path);
        }

        if (! $disk->exists($path)) {
            return null;
        }

        return URL::asset('storage/'.ltrim($path, '/'));
    }
}
