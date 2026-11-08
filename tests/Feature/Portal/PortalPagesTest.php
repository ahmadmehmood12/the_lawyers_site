<?php

namespace Tests\Feature\Portal;

use App\Models\Hearing;
use App\Models\LegalCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
