<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AccountType;
use App\Http\Controllers\Controller;
use App\Models\OrganizationInvitation;
use App\Services\Access\CurrentOrganization;
use App\Services\Organizations\OrganizationProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Accepting a firm invitation. The signed-in account's email must match the
 * invited email. Non-lawyer staff accounts register as clients first and are
 * converted to `staff` here; client data never crosses into the firm.
 */
class InvitationController extends Controller
{
    private function find(string $token): OrganizationInvitation
    {
        return OrganizationInvitation::query()
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())
            ->with('organization:id,name', 'inviter:id,name')
            ->firstOrFail();
    }

    public function show(Request $request, string $token): Response
    {
        $invitation = $this->find($token);

        return Inertia::render('Auth/Invitation', [
            'token' => $token,
            'invitation' => [
                'organization' => $invitation->organization->name,
                'inviter' => $invitation->inviter->name,
                'role' => $invitation->role->label(),
                'email' => $invitation->email,
            ],
            'emailMatches' => $request->user()?->email === $invitation->email,
        ]);
    }

    public function accept(Request $request, string $token, OrganizationProvisioner $provisioner, CurrentOrganization $current): RedirectResponse
    {
        $invitation = $this->find($token);
        $user = $request->user();

        if ($user->email !== $invitation->email) {
            return back()->with('error', __('This invitation was sent to a different email address.'));
        }

        if ($user->isPlatformStaff()) {
            return back()->with('error', __('Platform staff accounts cannot join organizations.'));
        }

        if ($user->account_type === AccountType::Client) {
            $user->forceFill(['account_type' => $invitation->role->isAdvocate() ? AccountType::Lawyer : AccountType::Staff])->save();
        }

        $provisioner->addMember($invitation->organization, $user, $invitation->role, $invitation->inviter);
        $invitation->update(['accepted_at' => now()]);
        $current->switchTo($user, $invitation->organization);

        return redirect()->route('dashboard')->with('success', __('Welcome to :name.', ['name' => $invitation->organization->name]));
    }
}
