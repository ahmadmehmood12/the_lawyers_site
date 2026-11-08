<?php

namespace Tests\Feature\Security;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Client;
use App\Models\Document;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cross-lawyer and cross-firm isolation: records of another organization must
 * be indistinguishable from records that do not exist (404, never 403).
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $intruder;

    private LegalCase $case;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $owner = $this->lawyer();
        $organization = $this->org($owner);
        $this->client = Client::factory()->create(['organization_id' => $organization->id]);
        $this->case = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $this->case->clients()->attach($this->client->id);
        $this->intruder = $this->lawyer(OrganizationType::Firm);
    }

    public function test_other_organizations_case_is_not_found(): void
    {
        $this->actingAs($this->intruder)->get(route('cases.show', $this->case))->assertNotFound();
        $this->actingAs($this->intruder)->get(route('cases.edit', $this->case))->assertNotFound();
        $this->actingAs($this->intruder)->put(route('cases.update', $this->case), ['title' => 'x'])->assertNotFound();
        $this->actingAs($this->intruder)->post(route('cases.archive', $this->case))->assertNotFound();
        $this->assertDatabaseMissing('legal_cases', ['id' => $this->case->id, 'title' => 'x']);
    }

    public function test_other_organizations_client_is_not_found(): void
    {
        $this->actingAs($this->intruder)->get(route('clients.show', $this->client))->assertNotFound();
        $this->actingAs($this->intruder)->delete(route('clients.destroy', $this->client))->assertNotFound();
        $this->assertNotSoftDeleted($this->client);
    }

    public function test_other_organizations_hearing_cannot_be_changed(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id]);

        $this->actingAs($this->intruder)->post(route('hearings.cancel', $hearing), ['reason' => 'hijack'])->assertNotFound();
        $this->actingAs($this->intruder)->post(route('hearings.outcome', $hearing), ['held_on' => today()->toDateString()])->assertNotFound();
        $this->actingAs($this->intruder)->post(route('cases.hearings.store', $this->case), ['hearing_date' => today()->addDay()->toDateString(), 'hearing_type' => 'regular'])->assertNotFound();
        $this->assertSame('scheduled', $hearing->fresh()->status->value);
    }

    public function test_other_organizations_documents_and_invoices_are_not_found(): void
    {
        $document = Document::factory()->create(['organization_id' => $this->case->organization_id]);
        $invoice = Invoice::factory()->create(['client_id' => $this->client->id]);

        $this->actingAs($this->intruder)->get(route('documents.show', $document))->assertNotFound();
        $this->actingAs($this->intruder)->get(route('documents.download', $document))->assertNotFound();
        $this->actingAs($this->intruder)->get(route('invoices.show', $invoice))->assertNotFound();
        $this->actingAs($this->intruder)->get(route('invoices.pdf', $invoice))->assertNotFound();
    }

    public function test_cannot_attach_foreign_client_to_own_case(): void
    {
        $this->actingAs($this->intruder)->post(route('cases.store'), [
            'title' => 'Stolen client', 'case_type' => 'civil', 'status' => 'filed', 'priority' => 'normal', 'client_ids' => [$this->client->id],
        ])->assertSessionHasErrors('client_ids');

        $this->assertDatabaseMissing('legal_cases', ['title' => 'Stolen client']);
    }

    public function test_listing_never_includes_other_organizations_cases(): void
    {
        $this->actingAs($this->intruder)->get(route('cases.index'))
            ->assertOk()->assertDontSee($this->case->title);
    }

    public function test_member_of_both_firms_switches_context_safely(): void
    {
        $firm = $this->org($this->intruder);
        $associate = $this->member($firm, OrgRole::AssociateAdvocate);

        $this->actingAs($associate)->post(route('organizations.switch', $this->case->organization_id))->assertNotFound();
    }
}
