<?php

namespace App\Http\Middleware;

use App\Services\Access\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Workspace routes require a professional user with an active membership.
 * Binds the resolved organization onto the request as `organization`.
 */
class EnsureOrganizationContext
{
    public function __construct(private CurrentOrganization $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isProfessional()) {
            abort(403);
        }

        $organization = $this->current->for($user);

        if (! $organization) {
            return redirect()->route('onboarding.organization');
        }

        $request->attributes->set('organization', $organization);

        return $next($request);
    }
}
