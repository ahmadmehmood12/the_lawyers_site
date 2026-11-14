<?php

namespace App\Services\WhatsApp;

/** Removes API tokens from error text before it reaches logs, the database or the browser. */
class SecretRedactor
{
    /** @param  list<string|null>  $secrets */
    public static function clean(string $message, array $secrets): string
    {
        foreach (array_filter($secrets) as $secret) {
            $message = str_replace((string) $secret, '[redacted]', $message);
        }

        // Green-API style URLs carry the token as the last path segment.
        $message = preg_replace('#(/waInstance\d+/[A-Za-z]+/)[^\s/?"\']+#', '$1[redacted]', $message) ?? $message;

        return mb_substr($message, 0, 500);
    }
}
