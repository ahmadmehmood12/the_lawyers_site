<?php

namespace App\Providers;

use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Services\Ai\AiProvider;
use App\Services\Ai\AnthropicProvider;
use App\Services\Ai\DisabledProvider;
use Illuminate\Auth\Events\Login;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Per-request memoization of memberships and the current organization.
        $this->app->scoped(OrganizationAccess::class);
        $this->app->scoped(CurrentOrganization::class);

        $this->app->bind(AiProvider::class, fn () => config('services.ai.provider') === 'anthropic' && config('services.ai.anthropic_key')
            ? new AnthropicProvider(config('services.ai.anthropic_key'), config('services.ai.model'), config('services.ai.max_tokens'))
            : new DisabledProvider);
    }

    public function boot(): void
    {
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(10)->mixedCase()->numbers()->uncompromised()
            : Password::min(8));

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        // Super admins pass every platform permission check (not organization-scoped ones).
        Gate::before(fn ($user, string $ability) => str_contains($ability, '.') && $user->isPlatformStaff() && $user->isSuperAdmin() ? true : null);

        Event::listen(Login::class, fn (Login $event) => $event->user->forceFill(['last_login_at' => now()])->saveQuietly());
    }
}
