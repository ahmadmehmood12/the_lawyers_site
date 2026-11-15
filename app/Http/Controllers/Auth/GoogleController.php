<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\GoogleSignIn;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * "Continue with Google" on the sign in and sign up pages (docs/Modules/Authentication.md).
 *  - Known Google account, or an account with the same verified email: signs in (two factor still asked).
 *  - New email: keeps the Google profile in the session and opens sign up with name and email filled,
 *    so lawyers still give their Bar Council details. No password is needed for that account.
 */
class GoogleController extends Controller
{
    public function __construct(private GoogleSignIn $google) {}

    public function redirect(Request $request): SymfonyRedirect|RedirectResponse
    {
        abort_unless($this->google->isEnabled(), 404);

        if (in_array($request->query('type'), ['lawyer', 'firm', 'client'], true)) {
            $request->session()->put('google_signup_type', $request->query('type'));
        }

        $this->google->configure();

        return Socialite::driver('google')->with(['prompt' => 'select_account'])->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        abort_unless($this->google->isEnabled(), 404);
        $this->google->configure();

        try {
            $account = Socialite::driver('google')->user();
        } catch (Throwable) {
            return redirect()->route('login')->with('error', __('Google sign in was cancelled or did not finish. Please try again.'));
        }

        $email = strtolower((string) $account->getEmail());
        $verified = (bool) ($account->user['email_verified'] ?? $account->user['verified_email'] ?? false);

        if ($email === '' || ! $verified) {
            return redirect()->route('login')->with('error', __('Your Google account has no verified email address.'));
        }

        $user = User::query()->where('google_id', $account->getId())->first() ?? User::query()->where('email', $email)->first();

        if (! $user) {
            $request->session()->put('google_signup', ['id' => (string) $account->getId(), 'name' => (string) ($account->getName() ?: $email), 'email' => $email]);
            $type = $request->session()->pull('google_signup_type');

            return redirect()->route('register', $type ? ['type' => $type] : [])
                ->with('success', __('Google confirmed :email. Choose your account type and add the remaining details to finish.', ['email' => $email]));
        }

        if ($user->status !== UserStatus::Active) {
            return redirect()->route('login')->with('error', __('Your account has been suspended. Please contact support.'));
        }

        $user->forceFill(['google_id' => $user->google_id ?: (string) $account->getId(), 'email_verified_at' => $user->email_verified_at ?? now()])->save();
        $request->session()->forget(['google_signup', 'google_signup_type']);

        // Same rule as the password form: an account with two factor on must still pass the code.
        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => true]);

            return redirect()->route('two-factor.login');
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(config('fortify.home', '/dashboard'));
    }
}
