<?php

namespace App\Http\Controllers\Account;

use App\Enums\AccountType;
use App\Enums\OrganizationType;
use App\Http\Controllers\Controller;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Shown to professionals without an active organization (e.g. removed from their firm). */
class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        if ($request->user()->organizations()->exists()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Onboarding/Organization', ['isLawyer' => $request->user()->isLawyer()]);
    }

    public function store(Request $request, OrganizationProvisioner $provisioner, LawyerProfileService $profiles): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->account_type === AccountType::Lawyer, 403);

        $validated = $request->validate([
            'type' => ['required', Rule::enum(OrganizationType::class)],
            'name' => ['required_if:type,firm', 'nullable', 'string', 'max:160'],
        ]);

        $profiles->createFor($user);
        $type = OrganizationType::from($validated['type']);
        $type === OrganizationType::Firm
            ? $provisioner->create($user, $type, $validated['name'])
            : $provisioner->createSoloPractice($user);

        return redirect()->route('dashboard');
    }
}
