<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Accepts Pakistani mobile numbers as 03XXXXXXXXX, 3XXXXXXXXX, +923XXXXXXXXX or 923XXXXXXXXX.
 * Use {@see self::normalize()} to store in E.164 (+923XXXXXXXXX).
 */
class PakistaniPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (self::normalize((string) $value) === null) {
            $fail(__('validation.phone_pk'));
        }
    }

    public static function normalize(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);

        if (preg_match('/^(?:92|0)?(3\d{9})$/', $digits, $matches)) {
            return '+92'.$matches[1];
        }

        return null;
    }
}
