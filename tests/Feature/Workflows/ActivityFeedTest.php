<?php

namespace Tests\Feature\Workflows;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Activity;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_entries_are_stamped_with_the_organization_and_read_as_sentences(): void
    {
        $owner = $this->lawyer(OrganizationType::Firm);
        $organization = $this->org($owner);
        $this->actingAs($owner);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id, 'title' => 'State vs. Rashid Ahmed']);

        $entry = Activity::query()->where('subject_type', $case->getMorphClass())->where('subject_id', $case->id)->sole();
        $this->assertSame($organization->id, $entry->organization_id);

        $this->get(route('activity.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Workspace/Activity')
            ->where('scope', 'firm')
            ->where('activities.data.0.sentence', $owner->name.' opened a new case: State vs. Rashid Ahmed')
            ->where('activities.data.0.url', route('cases.show', $case->id)));

        $this->getJson(route('activity.recent'))->assertOk()->assertJsonPath('items.0.sentence', $owner->name.' opened a new case: State vs. Rashid Ahmed');
    }

    public function test_members_without_firm_wide_access_only_see_their_own_work_and_visible_cases(): void
    {
        $owner = $this->lawyer(OrganizationType::Firm);
        $organization = $this->org($owner);
        $associate = $this->member($organization, OrgRole::AssociateAdvocate);

        $this->actingAs($owner);
        LegalCase::factory()->create(['organization_id' => $organization->id, 'title' => 'Confidential partner matter']);
        $this->actingAs($associate);
        LegalCase::factory()->create(['organization_id' => $organization->id, 'title' => 'Associate own matter']);

        $this->get(route('activity.index'))->assertInertia(fn (Assert $page) => $page
            ->where('scope', 'mine')
            ->has('activities.data', 1)
            ->where('activities.data.0.sentence', fn (string $s) => str_contains($s, 'Associate own matter')));
    }

    public function test_another_firm_never_sees_the_feed(): void
    {
        $owner = $this->lawyer(OrganizationType::Firm);
        $this->actingAs($owner);
        LegalCase::factory()->create(['organization_id' => $this->org($owner)->id, 'title' => 'Firm A matter']);

        $outsider = $this->lawyer(OrganizationType::Firm);
        $this->actingAs($outsider)->getJson(route('activity.recent'))->assertOk()->assertJsonCount(0, 'items');
    }

    public function test_admin_audit_names_cases_by_reference_not_title(): void
    {
        $owner = $this->lawyer();
        $this->actingAs($owner);
        $case = LegalCase::factory()->create(['organization_id' => $this->org($owner)->id, 'title' => 'Sensitive family matter']);

        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        $this->actingAs($admin)->get(route('admin.audit.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('activities.data.0.sentence', fn (string $s) => str_contains($s, $case->reference) && ! str_contains($s, 'Sensitive family matter'))
            ->where('activities.data.0.url', null));
    }
}
