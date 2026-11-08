<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Pakistani CNIC: 13 digits, optionally formatted 12345-1234567-1. */
class Cnic implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! preg_match('/^\d{5}-?\d{7}-?\d$/', (string) $value)) {
            $fail(__('validation.cnic'));
        }
    }

    public static function normalize(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        $d = preg_replace('/\D+/', '', $value);

        return strlen($d) === 13 ? substr($d, 0, 5).'-'.substr($d, 5, 7).'-'.substr($d, 12) : $value;
    }
}
