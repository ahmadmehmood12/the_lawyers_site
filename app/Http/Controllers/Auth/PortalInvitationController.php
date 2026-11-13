<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\PasswordValidationRules;
use App\Enums\AccountType;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A client opens the signed link from ClientPortalInvitation, chooses a password and lands in the
 * portal. Following the emailed link proves the address, so the account is marked verified.
 */
class PortalInvitationController extends Controller
{
    use PasswordValidationRules;

    public function show(User $user): Response|RedirectResponse
    {
        abort_unless($user->account_type === AccountType::Client, 404);

        if ($user->email_verified_at !== null) {
            return redirect()->route('login')->with('success', __('Your portal account is ready. Please sign in.'));
        }

        return Inertia::render('Auth/PortalInvitation', [
            'name' => $user->name,
            'email' => $user->email,
            'action' => request()->fullUrl(),
        ]);
    }

    public function accept(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->account_type === AccountType::Client && $user->email_verified_at === null, 404);
        $request->validate(['password' => $this->passwordRules()]);

        $user->forceFill(['password' => $request->input('password')])->save();
        $user->markEmailAsVerified();
        event(new Verified($user));

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('portal.dashboard')->with('success', __('Welcome. Your portal is ready.'));
    }
}
