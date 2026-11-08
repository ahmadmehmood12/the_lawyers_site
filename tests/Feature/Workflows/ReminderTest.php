<?php

namespace Tests\Feature\Workflows;

use App\Models\Client;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\NotificationDelivery;
use App\Models\WhatsAppTemplate;
use App\Notifications\HearingReminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_reminders_are_sent_once_per_offset(): void
    {
        Notification::fake();
        $lawyer = $this->lawyer();
        $case = LegalCase::factory()->create(['organization_id' => $this->org($lawyer)->id]);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'hearing_date' => today()->addDay(), 'assigned_lawyer_id' => $lawyer->id]);

        $this->artisan('reminders:dispatch')->assertSuccessful();
        $this->artisan('reminders:dispatch')->assertSuccessful();

        Notification::assertSentToTimes($lawyer, HearingReminder::class, 1);
    }

    public function test_offsets_not_configured_do_not_fire(): void
    {
        Notification::fake();
        $lawyer = $this->lawyer();
        $case = LegalCase::factory()->create(['organization_id' => $this->org($lawyer)->id]);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'hearing_date' => today()->addDays(2), 'assigned_lawyer_id' => $lawyer->id]);

        $this->artisan('reminders:dispatch')->assertSuccessful();

        Notification::assertNothingSent();
    }

    public function test_client_without_consent_gets_no_whatsapp(): void
    {
        Notification::fake();
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $case->clients()->attach(Client::factory()->create(['organization_id' => $organization->id])->id);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'hearing_date' => today()->addDay(), 'assigned_lawyer_id' => $lawyer->id]);

        $this->artisan('reminders:dispatch');

        Notification::assertSentOnDemandTimes(HearingReminder::class, 0);
    }

    public function test_client_with_consent_gets_whatsapp_via_on_demand_route(): void
    {
        Notification::fake();
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id]);
        $client = Client::factory()->create(['organization_id' => $organization->id, 'whatsapp' => '+923001112233']);
        $client->forceFill(['whatsapp_consent_at' => now()])->save();
        $case->clients()->attach($client->id);
        Hearing::factory()->create(['legal_case_id' => $case->id, 'hearing_date' => today()->addDay(), 'assigned_lawyer_id' => $lawyer->id]);

        $this->artisan('reminders:dispatch');

        Notification::assertSentOnDemand(HearingReminder::class, fn ($n, $channels, AnonymousNotifiable $notifiable) => $notifiable->routeNotificationFor('whatsapp') === '+923001112233');
    }

    public function test_unconfigured_whatsapp_is_logged_as_skipped_not_sent(): void
    {
        config(['services.whatsapp.token' => null]);
        $lawyer = $this->lawyer();
        $lawyer->notificationPreferences()->create(['event' => 'hearing_reminder', 'channel' => 'whatsapp', 'enabled' => true]);
        $case = LegalCase::factory()->create(['organization_id' => $this->org($lawyer)->id]);
        $hearing = Hearing::factory()->create(['legal_case_id' => $case->id, 'hearing_date' => today()->addDay(), 'assigned_lawyer_id' => $lawyer->id]);

        $lawyer->notify(new HearingReminder($hearing, 1));

        $this->assertDatabaseHas('notification_deliveries', ['channel' => 'whatsapp', 'status' => 'skipped', 'error' => 'not_configured']);
    }

    public function test_configured_whatsapp_sends_approved_template_and_webhook_updates_status(): void
    {
        config(['services.whatsapp.token' => 'test-token', 'services.whatsapp.phone_number_id' => '123', 'services.whatsapp.app_secret' => 'secret']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.ABC']]])]);
        WhatsAppTemplate::query()->where('key', 'hearing_reminder')->update(['status' => 'approved']);
        $lawyer = $this->lawyer();
        $lawyer->notificationPreferences()->create(['event' => 'hearing_reminder', 'channel' => 'whatsapp', 'enabled' => true]);
        $hearing = Hearing::factory()->create(['legal_case_id' => LegalCase::factory()->create(['organization_id' => $this->org($lawyer)->id])->id, 'hearing_date' => today()->addDay()]);

        $lawyer->notify(new HearingReminder($hearing, 1));
        $this->assertDatabaseHas('notification_deliveries', ['provider_message_id' => 'wamid.ABC', 'status' => 'sent']);

        $payload = json_encode(['entry' => [['changes' => [['value' => ['statuses' => [['id' => 'wamid.ABC', 'status' => 'delivered']]]]]]]]);
        $this->call('POST', '/api/webhooks/whatsapp', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $payload, 'secret')], $payload)->assertOk();
        $this->assertSame('delivered', NotificationDelivery::query()->where('provider_message_id', 'wamid.ABC')->value('status')->value);

        $this->call('POST', '/api/webhooks/whatsapp', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_HUB_SIGNATURE_256' => 'sha256=forged'], $payload)->assertUnauthorized();
    }
}
