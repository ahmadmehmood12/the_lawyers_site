<?php

namespace Tests\Feature\Workflows;

use App\Models\Client;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** Clients only see what their lawyer shared; internal fields never reach the browser. */
class ClientPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_portal_case_excludes_internal_notes_and_hidden_hearings(): void
    {
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        [$user, $client] = $this->clientUserFor($organization);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id, 'strategy_notes' => 'STRATEGY-SECRET', 'investigation_notes' => 'INVESTIGATION-SECRET', 'client_summary' => 'Visible progress']);
        $case->clients()->attach($client->id);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'purpose' => 'Visible hearing', 'internal_notes' => 'INTERNAL-NOTE']);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'purpose' => 'Hidden hearing', 'visible_to_client' => false]);

        $response = $this->actingAs($user)->get(route('portal.cases.show', $case))->assertOk();
        $response->assertSee('Visible progress')->assertSee('Visible hearing')->assertDontSee('Hidden hearing')
            ->assertDontSee('STRATEGY-SECRET')->assertDontSee('INVESTIGATION-SECRET')->assertDontSee('INTERNAL-NOTE');
        $response->assertInertia(fn (AssertableInertia $page) => $page->component('Portal/Cases/Show')->has('hearings', 1));
    }

    public function test_unshared_and_other_clients_cases_are_not_found(): void
    {
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        [$user, $client] = $this->clientUserFor($organization);
        $hidden = LegalCase::factory()->create(['organization_id' => $organization->id, 'share_with_client' => false]);
        $hidden->clients()->attach($client->id);
        $someoneElse = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $someoneElse->clients()->attach(Client::factory()->create(['organization_id' => $organization->id])->id);

        $this->actingAs($user)->get(route('portal.cases.show', $hidden))->assertNotFound();
        $this->actingAs($user)->get(route('portal.cases.show', $someoneElse))->assertNotFound();
    }

    public function test_clients_cannot_reach_workspace_or_admin(): void
    {
        $client = User::factory()->client()->create();

        $this->actingAs($client)->get(route('dashboard'))->assertForbidden();
        $this->actingAs($client)->get(route('cases.index'))->assertForbidden();
        $this->actingAs($client)->get(route('admin.dashboard'))->assertForbidden();
    }

    public function test_client_upload_lands_in_lawyers_vault(): void
    {
        Storage::fake('local');
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        [$user, $client] = $this->clientUserFor($organization);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $case->clients()->attach($client->id);

        $this->actingAs($user)->post(route('portal.documents.store'), ['legal_case_id' => $case->id, 'title' => 'CNIC copy', 'file' => UploadedFile::fake()->image('cnic.jpg')])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('documents', ['legal_case_id' => $case->id, 'source' => 'client', 'organization_id' => $organization->id]);
    }

    public function test_review_requires_eligibility(): void
    {
        $lawyer = $this->lawyer();
        $lawyer->lawyerProfile->update(['is_public' => true]);
        $stranger = User::factory()->client()->create();

        $this->actingAs($stranger)->post(route('portal.reviews.store', $lawyer->lawyerProfile->slug), ['rating' => 1, 'comment' => 'I never hired them but here is a review.'])->assertSessionHas('error');
        $this->assertDatabaseCount('reviews', 0);
    }
}
