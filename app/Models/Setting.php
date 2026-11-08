<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Platform-wide key/value settings managed from the admin panel.
 */
#[Fillable(['key', 'value'])]
class Setting extends Model
{
    /** Secrets are stored encrypted at rest; the prefix marks an encrypted value. */
    private const SECRET_PREFIX = 'enc:';

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = Cache::rememberForever('platform-settings', fn () => static::query()->pluck('value', 'key')->all());

        return $all[$key] ?? $default;
    }

    public static function put(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('platform-settings');
    }

    public static function putSecret(string $key, ?string $value): void
    {
        static::put($key, filled($value) ? self::SECRET_PREFIX.Crypt::encryptString($value) : null);
    }

    public static function getSecret(string $key, ?string $default = null): ?string
    {
        $raw = static::get($key);

        if (! is_string($raw) || $raw === '') {
            return $default;
        }

        if (! str_starts_with($raw, self::SECRET_PREFIX)) {
            return $raw;
        }

        try {
            return Crypt::decryptString(substr($raw, strlen(self::SECRET_PREFIX)));
        } catch (Throwable) {
            return $default;
        }
    }

    public static function hasSecret(string $key): bool
    {
        return filled(static::getSecret($key));
    }
}
