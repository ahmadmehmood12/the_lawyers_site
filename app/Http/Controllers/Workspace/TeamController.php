<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\MembershipStatus;
use App\Enums\OrgRole;
use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Mail\OrganizationInvitationMail;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMember;
use App\Services\Access\OrganizationAccess;
use App\Services\Subscriptions\SubscriptionService;
use App\Support\PublicFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Firm team management: invitations, roles, removal (docs/Modules/Law-Firms.md). */
class TeamController extends Controller
{
    private function authorizeTeam(Request $request): void
    {
        abort_unless(app(OrganizationAccess::class)->allows($request->user(), $this->organization(), 'team.manage'), 403);
    }

    public function index(Request $request): Response
    {
        $this->authorizeTeam($request);
        $organization = $this->organization();

        return Inertia::render('Workspace/Team/Index', [
            'members' => $organization->members()->with('user:id,name,email,phone,avatar_path')->whereIn('status', [MembershipStatus::Active->value, MembershipStatus::Suspended->value])->orderBy('id')->get()
                ->map(fn (OrganizationMember $m) => [
                    'id' => $m->id, 'user_id' => $m->user_id, 'name' => $m->user->name, 'avatar_url' => PublicFile::url($m->user->avatar_path), 'email' => $m->user->email, 'phone' => $m->user->phone,
                    'role' => $m->role->value, 'role_label' => $m->role->label(), 'status' => $m->status->value, 'status_label' => $m->status->label(),
                    'is_owner' => $m->user_id === $organization->owner_id, 'joined_at' => $m->joined_at?->toDateString(),
                ]),
            'invitations' => $organization->invitations()->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())->latest()->get()
                ->map(fn ($i) => ['id' => $i->id, 'email' => $i->email, 'role' => $i->role->value, 'role_label' => $i->role->label(), 'expires_at' => $i->expires_at->toDateString()]),
            'roles' => collect(OrgRole::options())->reject(fn ($r) => $r['value'] === OrgRole::Owner->value)->values(),
            'permissions' => collect(OrgRole::cases())->mapWithKeys(fn (OrgRole $r) => [$r->value => $r->permissions()]),
            'isFirm' => $organization->isFirm(),
        ]);
    }

    public function invite(Request $request, SubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorizeTeam($request);
        $organization = $this->organization();
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::enum(OrgRole::class), Rule::notIn([OrgRole::Owner->value])],
        ]);

        if (! $subscriptions->canAdd($organization, PlanFeature::MaxTeamMembers)) {
            return back()->with('error', __('Your plan’s team member limit has been reached.'));
        }

        $email = strtolower($validated['email']);
        if ($organization->members()->whereHas('user', fn ($q) => $q->where('email', $email))->where('status', MembershipStatus::Active->value)->exists()) {
            return back()->withErrors(['email' => __('This person is already a member.')]);
        }

        $organization->invitations()->where('email', $email)->whereNull('accepted_at')->update(['revoked_at' => now()]);
        $token = Str::random(48);
        $invitation = $organization->invitations()->create([
            'email' => $email,
            'role' => $validated['role'],
            'token_hash' => hash('sha256', $token),
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays(config('legal.invitation_ttl_days')),
        ]);

        Mail::to($email)->queue(new OrganizationInvitationMail($invitation, $token));

        return back()->with('success', __('Invitation sent to :email.', ['email' => $email]));
    }

    public function revokeInvitation(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $this->authorizeTeam($request);
        abort_unless($invitation->organization_id === $this->organization()->id, 404);
        $invitation->update(['revoked_at' => now()]);

        return back()->with('success', __('Invitation revoked.'));
    }

    public function update(Request $request, OrganizationMember $member): RedirectResponse
    {
        $this->authorizeTeam($request);
        $organization = $this->organization();
        abort_unless($member->organization_id === $organization->id, 404);

        if ($member->user_id === $organization->owner_id) {
            return back()->with('error', __('The owner’s role cannot be changed.'));
        }

        $validated = $request->validate([
            'role' => ['required', Rule::enum(OrgRole::class), Rule::notIn([OrgRole::Owner->value])],
            'status' => ['required', Rule::in([MembershipStatus::Active->value, MembershipStatus::Suspended->value, MembershipStatus::Removed->value])],
        ]);

        $member->update($validated);
        activity('team')->causedBy($request->user())->performedOn($member)->withProperties($validated)->log('membership_updated');
        app(OrganizationAccess::class)->forget();

        return back()->with('success', __('Team member updated.'));
    }
}
