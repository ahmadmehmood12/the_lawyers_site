<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use Inertia\Response;
use JsonSerializable;
use ReflectionProperty;

/**
 * Turns the props of a web (Inertia) page into plain data for the mobile API, so an API read
 * endpoint runs the very same controller method (same queries, policies and shapes) as the web.
 * Lazy props (closures, Inertia::defer/optional/once) are resolved; models, collections and
 * paginators are serialized exactly as Inertia would send them.
 */
class InertiaPayload
{
    /**
     * @param  list<string>|null  $only  top-level props to keep (null keeps all)
     * @return array<string, mixed>
     */
    public static function props(Response $response, ?array $only = null): array
    {
        $props = (new ReflectionProperty($response, 'props'))->getValue($response);

        if ($only !== null) {
            $props = array_intersect_key($props, array_flip($only));
        }

        return self::resolve($props);
    }

    private static function resolve(mixed $value): mixed
    {
        if (is_object($value) && is_callable($value)) {
            return self::resolve($value());
        }

        if ($value instanceof Arrayable || $value instanceof JsonSerializable) {
            return json_decode((string) json_encode($value), true);
        }

        if (is_array($value)) {
            return array_map(fn ($item) => self::resolve($item), $value);
        }

        return $value;
    }
}
