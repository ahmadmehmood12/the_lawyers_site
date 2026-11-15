<?php

namespace App\Services\Auth;

use App\Models\Setting;

/**
 * Sign in and sign up with Google (Auth\GoogleController). Credentials come from Admin, Settings,
 * Sign-in page (secret stored encrypted) and fall back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 * The buttons only show when it is switched on and both values are present.
 */
class GoogleSignIn
{
    public function clientId(): ?string
    {
        return Setting::get('google_client_id') ?: config('services.google.client_id');
    }

    public function clientSecret(): ?string
    {
        return Setting::getSecret('google_client_secret') ?: config('services.google.client_secret');
    }

    public function isEnabled(): bool
    {
        return Setting::get('google_signin_enabled', '1') === '1' && filled($this->clientId()) && filled($this->clientSecret());
    }

    /** The exact address to add under "Authorized redirect URIs" in Google Cloud. */
    public function redirectUrl(): string
    {
        return route('auth.google.callback');
    }

    /** Points Socialite at the current credentials before a redirect or callback. */
    public function configure(): void
    {
        config(['services.google' => [
            'client_id' => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect' => $this->redirectUrl(),
        ]]);
    }
}
