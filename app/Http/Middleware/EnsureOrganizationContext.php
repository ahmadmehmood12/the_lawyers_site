<?php

namespace App\Http\Middleware;

use App\Services\Access\CurrentOrganization;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Workspace routes require a professional user with an active membership. Advocates never need a
 * law firm: one without any membership gets solo chambers here. Staff without a firm see onboarding.
 * Binds the resolved organization onto the request as `organization`.
 */
class EnsureOrganizationContext
{
    public function __construct(private CurrentOrganization $current, private OrganizationProvisioner $provisioner, private LawyerProfileService $profiles) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isProfessional()) {
            abort(403);
        }

        $organization = $this->current->for($user);

        // A law firm is optional: an advocate without any membership gets their own chambers at once.
        if (! $organization && $user->isLawyer()) {
            $this->profiles->createFor($user);
            $this->provisioner->createSoloPractice($user);
            $organization = $this->current->for($user->refresh());
        }

        if (! $organization) {
            return redirect()->route('onboarding.organization');
        }

        $request->attributes->set('organization', $organization);

        return $next($request);
    }
}
