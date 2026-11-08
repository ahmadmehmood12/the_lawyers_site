<?php

namespace Tests\Feature\Workflows;

use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\User;
use App\Services\Hearings\HearingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Hearings are append-only history; the case always points at its next hearing. */
class HearingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $lawyer;

    private LegalCase $case;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->lawyer = $this->lawyer();
        $this->case = LegalCase::factory()->create(['organization_id' => $this->org($this->lawyer)->id]);
        $this->case->lawyers()->attach($this->lawyer->id, ['role' => 'lead']);
        $this->actingAs($this->lawyer);
    }

    public function test_scheduling_sets_case_next_hearing(): void
    {
        $this->post(route('cases.hearings.store', $this->case), ['hearing_date' => today()->addDays(5)->toDateString(), 'hearing_time' => '10:30', 'hearing_type' => 'regular', 'purpose' => 'Arguments'])
            ->assertSessionHasNoErrors();

        $hearing = $this->case->hearings()->sole();
        $this->assertSame($hearing->id, $this->case->fresh()->next_hearing_id);
        $this->assertDatabaseHas('case_events', ['legal_case_id' => $this->case->id, 'type' => 'hearing_scheduled']);
    }

    public function test_recording_outcome_schedules_next_and_preserves_history(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()]);

        $this->post(route('hearings.outcome', $hearing), [
            'held_on' => today()->toDateString(), 'lawyer_attendance' => 'present', 'order_passed' => 'Adjourned for evidence.',
            'adjournment_reason' => 'Witness absent', 'schedule_next' => true, 'next_hearing_date' => today()->addDays(14)->toDateString(), 'next_hearing_purpose' => 'Evidence',
        ])->assertSessionHasNoErrors();

        $hearing->refresh();
        $this->assertSame('adjourned', $hearing->status->value);
        $this->assertSame('Adjourned for evidence.', $hearing->order_passed);
        $next = Hearing::query()->where('previous_hearing_id', $hearing->id)->sole();
        $this->assertSame(today()->addDays(14)->toDateString(), $next->hearing_date->toDateString());
        $this->assertSame($next->id, $this->case->fresh()->next_hearing_id);
        $this->assertSame(2, $this->case->hearings()->count());
    }

    public function test_correcting_outcome_does_not_create_duplicate_next_hearing(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()]);
        $payload = ['held_on' => today()->toDateString(), 'schedule_next' => true, 'next_hearing_date' => today()->addDays(7)->toDateString()];

        $this->post(route('hearings.outcome', $hearing), $payload);
        $this->post(route('hearings.outcome', $hearing), [...$payload, 'order_passed' => 'Corrected order']);

        $this->assertSame(2, $this->case->hearings()->count());
        $this->assertSame('Corrected order', $hearing->fresh()->order_passed);
        $this->assertDatabaseHas('case_events', ['type' => 'hearing_outcome_corrected']);
    }

    public function test_reschedule_keeps_original_record(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()->addDays(2)]);

        $this->post(route('hearings.reschedule', $hearing), ['hearing_date' => today()->addDays(9)->toDateString(), 'reason' => 'Judge on leave'])->assertSessionHasNoErrors();

        $hearing->refresh();
        $this->assertSame('rescheduled', $hearing->status->value);
        $this->assertSame(today()->addDays(2)->toDateString(), $hearing->hearing_date->toDateString());
        $this->assertSame($hearing->rescheduled_to_id, $this->case->fresh()->next_hearing_id);
    }

    public function test_changing_date_through_edit_is_refused(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()->addDays(2)]);

        $this->put(route('hearings.update', $hearing), ['hearing_date' => today()->addDays(4)->toDateString(), 'hearing_type' => 'regular'])->assertSessionHas('error');
        $this->assertSame(today()->addDays(2)->toDateString(), $hearing->fresh()->hearing_date->toDateString());
    }

    public function test_cancel_clears_next_hearing_and_requires_reason(): void
    {
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()->addDay()]);
        app(HearingService::class)->refreshNextHearing($this->case);

        $this->post(route('hearings.cancel', $hearing), ['reason' => ''])->assertSessionHasErrors('reason');
        $this->post(route('hearings.cancel', $hearing), ['reason' => 'Matter settled'])->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $hearing->fresh()->status->value);
        $this->assertNull($this->case->fresh()->next_hearing_id);
    }

    public function test_conflict_endpoint_warns_about_overlaps(): void
    {
        Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()->addDay(), 'hearing_time' => '10:00', 'assigned_lawyer_id' => $this->lawyer->id]);

        $this->getJson(route('hearings.conflicts', ['date' => today()->addDay()->toDateString(), 'time' => '10:30']))
            ->assertOk()->assertJsonCount(1, 'conflicts');
        $this->getJson(route('hearings.conflicts', ['date' => today()->addDay()->toDateString(), 'time' => '15:00']))
            ->assertOk()->assertJsonCount(0, 'conflicts');
    }

    public function test_order_photo_is_saved_to_case_documents(): void
    {
        Storage::fake('local');
        $hearing = Hearing::factory()->create(['legal_case_id' => $this->case->id, 'hearing_date' => today()]);

        $this->post(route('hearings.outcome', $hearing), ['held_on' => today()->toDateString(), 'order_photo' => UploadedFile::fake()->image('order.jpg')])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('documents', ['hearing_id' => $hearing->id, 'category' => 'court_order', 'legal_case_id' => $this->case->id]);
    }
}
