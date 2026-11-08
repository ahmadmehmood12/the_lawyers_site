<?php

namespace Tests\Feature\Security;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Client;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Role matrix inside a firm (config/legal.php → org_roles). */
class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    private Organization $firm;

    private LegalCase $case;

    protected function setUp(): void
    {
        parent::setUp();
        $owner = $this->lawyer(OrganizationType::Firm);
        $this->firm = $this->org($owner);
        $this->case = LegalCase::factory()->create(['organization_id' => $this->firm->id, 'title' => 'Firm Matter Alpha']);
    }

    public function test_junior_sees_only_assigned_cases(): void
    {
        $junior = $this->member($this->firm, OrgRole::JuniorAdvocate);
        $assigned = LegalCase::factory()->create(['organization_id' => $this->firm->id, 'title' => 'Junior Matter Beta']);
        $assigned->lawyers()->attach($junior->id, ['role' => 'assisting']);

        $this->actingAs($junior)->get(route('cases.index'))->assertOk()->assertSee('Junior Matter Beta')->assertDontSee('Firm Matter Alpha');
        $this->actingAs($junior)->get(route('cases.show', $assigned))->assertOk();
        $this->actingAs($junior)->get(route('cases.show', $this->case))->assertNotFound();
    }

    public function test_junior_gains_access_through_assigned_hearing(): void
    {
        $junior = $this->member($this->firm, OrgRole::JuniorAdvocate);
        Hearing::factory()->create(['legal_case_id' => $this->case->id, 'assigned_lawyer_id' => $junior->id]);

        $this->actingAs($junior)->get(route('cases.show', $this->case))->assertOk();
    }

    /** @return array<string, array{OrgRole, bool}> */
    public static function financeRoles(): array
    {
        return [
            'owner' => [OrgRole::Owner, true],
            'senior' => [OrgRole::SeniorAdvocate, true],
            'accountant' => [OrgRole::Accountant, true],
            'associate' => [OrgRole::AssociateAdvocate, false],
            'junior' => [OrgRole::JuniorAdvocate, false],
            'clerk' => [OrgRole::Clerk, false],
            'receptionist' => [OrgRole::Receptionist, false],
            'assistant' => [OrgRole::LegalAssistant, false],
        ];
    }

    #[DataProvider('financeRoles')]
    public function test_finance_access_by_role(OrgRole $role, bool $allowed): void
    {
        $user = $role === OrgRole::Owner ? User::find($this->firm->owner_id) : $this->member($this->firm, $role, ! $role->isAdvocate());
        $response = $this->actingAs($user)->get(route('invoices.index'));
        $allowed ? $response->assertOk() : $response->assertForbidden();
    }

    public function test_view_permission_does_not_grant_edit(): void
    {
        $accountant = $this->member($this->firm, OrgRole::Accountant, true);

        $this->actingAs($accountant)->get(route('cases.show', $this->case))->assertOk();
        $this->actingAs($accountant)->put(route('cases.update', $this->case), ['title' => 'Edited', 'case_type' => 'civil', 'status' => 'filed', 'priority' => 'normal'])->assertForbidden();
    }

    public function test_receptionist_cannot_open_case_files_but_sees_diary(): void
    {
        $receptionist = $this->member($this->firm, OrgRole::Receptionist, true);

        $this->actingAs($receptionist)->get(route('diary.index'))->assertOk();
        $this->actingAs($receptionist)->get(route('cases.show', $this->case))->assertNotFound();
    }

    public function test_clerk_can_record_hearing_outcome(): void
    {
        $clerk = $this->member($this->firm, OrgRole::Clerk, true);
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()]);

        $this->actingAs($clerk)->post(route('hearings.outcome', $hearing), ['held_on' => today()->toDateString(), 'order_passed' => 'Adjourned.'])->assertSessionHasNoErrors();
        $this->assertSame('Adjourned.', $hearing->fresh()->order_passed);
    }

    public function test_only_team_managers_can_invite(): void
    {
        $senior = $this->member($this->firm, OrgRole::SeniorAdvocate);

        $this->actingAs($senior)->post(route('team.invite'), ['email' => 'x@example.com', 'role' => 'clerk'])->assertForbidden();
    }

    public function test_member_cannot_escalate_to_owner_role(): void
    {
        $owner = User::find($this->firm->owner_id);
        $member = $this->member($this->firm, OrgRole::Clerk, true);
        $membership = $this->firm->members()->where('user_id', $member->id)->first();

        $this->actingAs($owner)->put(route('team.members.update', $membership), ['role' => 'owner', 'status' => 'active'])->assertSessionHasErrors('role');
        $this->assertSame(OrgRole::Clerk, $membership->fresh()->role);
    }

    public function test_sensitive_client_fields_masked_without_permission(): void
    {
        $client = Client::factory()->create(['organization_id' => $this->firm->id, 'cnic' => '35202-1234567-1', 'notes' => 'Secret strategy']);
        $junior = $this->member($this->firm, OrgRole::JuniorAdvocate);

        $this->actingAs($junior)->get(route('clients.show', $client))->assertOk()
            ->assertDontSee('1234567')->assertDontSee('Secret strategy')->assertSee('35202-*******-1');
    }

    public function test_suspended_member_loses_access(): void
    {
        $associate = $this->member($this->firm, OrgRole::AssociateAdvocate);
        $this->firm->members()->where('user_id', $associate->id)->update(['status' => 'suspended']);

        $this->actingAs($associate)->get(route('dashboard'))->assertRedirect(route('onboarding.organization'));
    }

    public function test_invoice_from_another_firm_member_role_check(): void
    {
        $associate = $this->member($this->firm, OrgRole::AssociateAdvocate);
        $client = Client::factory()->create(['organization_id' => $this->firm->id]);
        $invoice = Invoice::factory()->create(['client_id' => $client->id]);

        $this->actingAs($associate)->get(route('invoices.show', $invoice))->assertForbidden();
    }
}
