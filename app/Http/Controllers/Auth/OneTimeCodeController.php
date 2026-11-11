<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\OneTimeCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Six-digit code steps that replace the signed links (docs/Modules/Authentication.md).
 *  - Email verification: Fortify's resend route sends the code (User::sendEmailVerificationNotification),
 *    verifyEmail() checks it.
 *  - Password reset: Fortify's forgot-password route sends the code (User::sendPasswordResetNotification),
 *    verifyReset() checks it and hands over to Fortify's reset-password form with a fresh broker token.
 */
class OneTimeCodeController extends Controller
{
    public function __construct(private OneTimeCodeService $codes) {}

    public function verifyEmail(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'digits:6']]);
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('home.redirect'));
        }

        if (! $this->codes->verify($user->email, OneTimeCodeService::VerifyEmail, (string) $request->input('code'))) {
            throw ValidationException::withMessages(['code' => __('That code is wrong or has expired. Check the latest email or send a new code.')]);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return redirect()->intended(route('home.redirect'))->with('success', __('Your email address is verified.'));
    }

    public function showReset(Request $request): Response|RedirectResponse
    {
        $email = (string) $request->query('email', '');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Auth/ResetCode', ['email' => strtolower($email)]);
    }

    public function verifyReset(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'digits:6']]);
        $user = User::query()->where('email', strtolower($data['email']))->first();

        if (! $user || ! $this->codes->verify($user->email, OneTimeCodeService::ResetPassword, $data['code'])) {
            throw ValidationException::withMessages(['code' => __('That code is wrong or has expired. Check the latest email or send a new code.')]);
        }

        $token = Password::broker(config('fortify.passwords'))->createToken($user);

        return redirect()->route('password.reset', ['token' => $token, 'email' => $user->email]);
    }
}
