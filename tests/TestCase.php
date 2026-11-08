<?php

namespace Tests;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Client;
use App\Models\Organization;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use Database\Seeders\TestBaseSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Reference data, roles and plans are seeded once per run (see TestBaseSeeder). */
    protected bool $seed = true;

    protected string $seeder = TestBaseSeeder::class;

    /** Kept for readability in tests; base data is already seeded. */
    protected function seedPlatform(): void {}

    /** A lawyer owning a solo practice (or firm). */
    protected function lawyer(OrganizationType $type = OrganizationType::Solo): User
    {
        $user = User::factory()->create();
        app(OrganizationProvisioner::class)->create($user, $type, $user->name.' Chambers');
        app(LawyerProfileService::class)->createFor($user);

        return $user->fresh();
    }

    protected function member(Organization $organization, OrgRole $role, bool $staff = false): User
    {
        $user = $staff ? User::factory()->staff()->create() : User::factory()->create();
        app(OrganizationProvisioner::class)->addMember($organization, $user, $role);
        $user->forceFill(['current_organization_id' => $organization->id])->save();

        return $user->fresh();
    }

    protected function org(User $user): Organization
    {
        return $user->currentOrganization()->firstOrFail();
    }

    /** A portal client account linked to a client record in the organization. */
    protected function clientUserFor(Organization $organization): array
    {
        $user = User::factory()->client()->create();
        $client = Client::factory()->create(['organization_id' => $organization->id, 'user_id' => $user->id]);

        return [$user, $client];
    }

    protected function tearDown(): void
    {
        app(OrganizationAccess::class)->forget();
        parent::tearDown();
    }
}
