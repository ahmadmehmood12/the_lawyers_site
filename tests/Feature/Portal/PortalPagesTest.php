<?php

namespace Tests\Feature\Portal;

use App\Models\Hearing;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PortalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_portal_pages_render_for_client(): void
    {
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        [$user, $client] = $this->clientUserFor($organization);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $case->clients()->attach($client->id);
        $case->lawyers()->attach($lawyer->id, ['role' => 'lead']);
        Hearing::factory()->create(['legal_case_id' => $case->id]);

        $this->actingAs($user);
        foreach (['portal.dashboard', 'portal.cases.index', 'portal.documents.index', 'portal.invoices.index', 'portal.appointments.index', 'portal.favourites', 'portal.messages.index', 'account.edit', 'notifications.index'] as $route) {
            $this->get(route($route))->assertOk();
        }
        $this->get(route('portal.cases.show', $case))->assertOk();
        $this->get(route('portal.book', $lawyer->lawyerProfile->slug))->assertNotFound(); // profile not published
    }

    public function test_portal_directories_render_inside_the_portal_layout(): void
    {
        $profile = LawyerProfile::factory()->create(['is_public' => true]);
        $firm = Organization::factory()->firm()->create(['is_public' => true, 'status' => 'active']);
        [$user] = $this->clientUserFor($this->org($this->lawyer()));

        $this->actingAs($user);

        $this->get(route('portal.lawyers.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Public/Lawyers/Index')
            ->where('embedded', 'portal'));
        $this->get(route('portal.lawyers.show', $profile->slug))->assertInertia(fn (Assert $page) => $page
            ->component('Public/Lawyers/Show')
            ->where('embedded', 'portal'));
        $this->get(route('portal.firms.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Public/Firms/Index')
            ->where('embedded', 'portal'));
        $this->get(route('portal.firms.show', $firm->slug))->assertInertia(fn (Assert $page) => $page
            ->component('Public/Firms/Show')
            ->where('embedded', 'portal'));
    }
}
