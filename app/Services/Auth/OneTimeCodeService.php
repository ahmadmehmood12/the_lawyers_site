<?php

namespace App\Services\Auth;

use App\Notifications\OneTimeCode;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Issues and checks the six-digit codes that replace Laravel's signed links for
 * email verification and password reset. A code lives 10 minutes, allows 5 wrong
 * tries and is deleted once used. Issuing a new code replaces the old one.
 */
class OneTimeCodeService
{
    public const VerifyEmail = 'verify_email';

    public const ResetPassword = 'reset_password';

    public const MinutesValid = 10;

    public const MaxAttempts = 5;

    public function send(CanResetPassword $user, string $purpose): void
    {
        $code = (string) random_int(100000, 999999);
        $email = strtolower($user->getEmailForPasswordReset());

        DB::table('one_time_codes')->updateOrInsert(
            ['email' => $email, 'purpose' => $purpose],
            ['code_hash' => Hash::make($code), 'attempts' => 0, 'expires_at' => now()->addMinutes(self::MinutesValid), 'created_at' => now(), 'updated_at' => now()],
        );

        try {
            $user->notify(new OneTimeCode($code, $purpose));
        } catch (\Throwable $exception) {
            // A mail outage must not break sign-up; the user can ask for a new code.
            report($exception);
        }
    }

    /** True when the code matches; a match consumes it. */
    public function verify(string $email, string $purpose, string $code): bool
    {
        $query = DB::table('one_time_codes')->where('email', strtolower($email))->where('purpose', $purpose);
        $row = $query->first();

        if (! $row || now()->greaterThan($row->expires_at) || $row->attempts >= self::MaxAttempts) {
            return false;
        }

        if (! Hash::check($code, $row->code_hash)) {
            (clone $query)->increment('attempts');

            return false;
        }

        (clone $query)->delete();

        return true;
    }
}
