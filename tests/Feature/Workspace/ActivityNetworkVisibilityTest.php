<?php

namespace Tests\Feature\Workspace;

use App\Enums\OrgRole;
use App\Models\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ActivityNetworkVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_activity_never_exposes_ip_addresses_or_devices(): void
    {
        $owner = $this->lawyer();
        $organization = $this->org($owner);
        $senior = $this->member($organization, OrgRole::SeniorAdvocate);

        Activity::query()->create([
            'organization_id' => $organization->id,
            'log_name' => 'cases',
            'description' => 'login',
            'causer_type' => $senior->getMorphClass(),
            'causer_id' => $senior->id,
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        ]);

        $this->actingAs($owner)->get(route('activity.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->missing('canSeeNetwork')
            ->missing('summary.ips')
            ->where('activities.data.0.ip_address', null)
            ->where('activities.data.0.device', null));

        $this->actingAs($senior)->get(route('activity.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->missing('canSeeNetwork')
            ->missing('summary.ips')
            ->where('activities.data.0.ip_address', null)
            ->where('activities.data.0.device', null));

        $this->actingAs($senior)->getJson(route('activity.recent'))
            ->assertOk()
            ->assertJsonPath('items.0.ip_address', null)
            ->assertJsonPath('items.0.device', null);
    }
}
