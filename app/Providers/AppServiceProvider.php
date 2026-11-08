<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Organization;
use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Services\Ai\AiProvider;
use App\Services\Ai\AnthropicProvider;
use App\Services\Ai\DisabledProvider;
use App\Services\Mail\MailSettings;
use Illuminate\Auth\Events\Login;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

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
        try {
            app(MailSettings::class)->apply();
        } catch (\Throwable) {
            // The settings table may not exist yet (migrations, early boot).
        }

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

        // Stamp each audit entry with the organization it belongs to (firm activity feed scoping).
        Activity::creating(function (Activity $activity): void {
            if ($activity->getAttribute('organization_id') !== null || ! $activity->subject_type) {
                return;
            }
            $subject = $activity->subject;
            $activity->setAttribute('organization_id', $subject instanceof Organization ? $subject->id : $subject?->getAttribute('organization_id'));
        });

        /*
         * Render branded error pages for Inertia visits. Non-Inertia requests
         * fall through to resources/views/errors/*.blade.php. Validation (422)
         * is intentionally excluded so Inertia's error bag handling is untouched.
         */
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): ?ExceptionResponse {
            $status = $response->statusCode();

            if (! $response->request->inertia() || $status < 400 || $status === 422 || ($status >= 500 && config('app.debug'))) {
                return null;
            }

            $page = $response->render('Errors/Show', ['status' => $status]);

            // Shared props (site name, translations, user) need the session, which unmatched URLs never start.
            return $response->request->hasSession() ? $page->withSharedData() : $page;
        });
    }
}
