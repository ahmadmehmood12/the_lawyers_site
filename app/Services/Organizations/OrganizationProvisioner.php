<?php

namespace App\Services\Organizations;

use App\Enums\MembershipStatus;
use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates organizations (solo practices and firms) and manages memberships.
 * Every lawyer works inside an organization so tenancy rules are uniform.
 */
class OrganizationProvisioner
{
    public function __construct(private SubscriptionService $subscriptions, private OrganizationAccess $access) {}

    public function create(User $owner, OrganizationType $type, string $name, array $attributes = []): Organization
    {
        return DB::transaction(function () use ($owner, $type, $name, $attributes): Organization {
            $organization = Organization::create([
                ...$attributes,
                'type' => $type,
                'name' => $name,
                'slug' => $this->uniqueSlug($name),
                'owner_id' => $owner->id,
            ]);

            $this->addMember($organization, $owner, OrgRole::Owner);
            $this->subscriptions->startDefault($organization);

            if (! $owner->current_organization_id) {
                $owner->forceFill(['current_organization_id' => $organization->id])->save();
            }

            return $organization;
        });
    }

    public function createSoloPractice(User $lawyer): Organization
    {
        return $this->create($lawyer, OrganizationType::Solo, $lawyer->name.' — '.__('Chambers'));
    }

    public function addMember(Organization $organization, User $user, OrgRole $role, ?User $invitedBy = null): OrganizationMember
    {
        $member = OrganizationMember::query()->updateOrCreate(
            ['organization_id' => $organization->id, 'user_id' => $user->id],
            ['role' => $role, 'status' => MembershipStatus::Active, 'invited_by' => $invitedBy?->id, 'joined_at' => now()],
        );

        $this->access->forget();

        return $member;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug(Str::limit($name, 60, '')) ?: 'practice';
        $slug = $base;
        $i = 2;

        while (Organization::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
