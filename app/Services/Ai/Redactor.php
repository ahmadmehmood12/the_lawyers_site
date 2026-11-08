<?php

namespace App\Services\Ai;

/**
 * Masks personal identifiers before text leaves the platform for an external AI
 * provider: CNICs, phone numbers, emails, and any explicitly supplied names
 * (client/party names). Replacements are reversible only on our side.
 */
class Redactor
{
    /** @var array<string, string> token => original */
    private array $map = [];

    /**
     * @param  list<string>  $names
     */
    public function redact(string $text, array $names = []): string
    {
        $i = 0;
        $swap = function (string $kind, string $value) use (&$i): string {
            $token = '['.$kind.'_'.(++$i).']';
            $this->map[$token] = $value;

            return $token;
        };

        $text = preg_replace_callback('/\b\d{5}-?\d{7}-?\d\b/', fn ($m) => $swap('CNIC', $m[0]), $text) ?? $text;
        $text = preg_replace_callback('/(?:\+92|0092|\b0)3\d{2}[\s-]?\d{7}\b/', fn ($m) => $swap('PHONE', $m[0]), $text) ?? $text;
        $text = preg_replace_callback('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', fn ($m) => $swap('EMAIL', $m[0]), $text) ?? $text;

        usort($names, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
        foreach (array_filter(array_unique($names), fn ($n) => mb_strlen(trim((string) $n)) >= 3) as $name) {
            $token = null;
            $text = preg_replace_callback('/'.preg_quote($name, '/').'/iu', function ($m) use (&$token, $swap) {
                return $token ??= $swap('PERSON', $m[0]);
            }, $text) ?? $text;
        }

        return $text;
    }

    public function restore(string $text): string
    {
        return strtr($text, $this->map);
    }
}
