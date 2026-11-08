<?php

namespace Tests\Feature\Workflows;

use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use App\Notifications\SupportMessageReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FeedbackInboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_stores_a_referenced_message_and_emails_an_acknowledgement(): void
    {
        Notification::fake();

        $this->post(route('contact.submit'), [
            'name' => 'Sana Malik',
            'email' => 'sana@example.com',
            'subject' => 'Question about verification',
            'body' => 'How long does verification usually take?',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $message = ContactMessage::query()->sole();
        $this->assertMatchesRegularExpression('/^CT-\d{4}-\d{5}$/', $message->reference);
        $this->assertFalse($message->whatsapp_consent);

        Notification::assertSentOnDemand(SupportMessageReceived::class, fn ($n, array $channels, AnonymousNotifiable $to) => $channels === ['mail']
            && $to->routeNotificationFor('mail') === 'sana@example.com');
    }

    public function test_whatsapp_acknowledgement_only_with_consent(): void
    {
        Notification::fake();

        $this->post(route('contact.submit'), [
            'name' => 'Sana Malik',
            'email' => 'sana@example.com',
            'phone' => '03001112233',
            'whatsapp_consent' => true,
            'subject' => 'Partnership',
            'body' => 'We would like to discuss onboarding our chambers.',
        ])->assertSessionHasNoErrors();

        Notification::assertSentOnDemand(SupportMessageReceived::class, fn ($n, array $channels, AnonymousNotifiable $to) => in_array(WhatsAppChannel::class, $channels, true)
            && $to->routeNotificationFor('whatsapp') === '+923001112233');
    }

    public function test_any_signed_in_user_can_send_feedback_linked_to_their_account(): void
    {
        Notification::fake();
        [$client] = $this->clientUserFor($this->org($this->lawyer()));

        $this->actingAs($client)->get(route('feedback.create'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('Account/Feedback')->where('area', 'portal'));
        $this->actingAs($client)->post(route('feedback.store'), [
            'category' => 'problem',
            'subject' => 'Cannot see my next hearing',
            'body' => 'My case page shows no upcoming hearing.',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $message = ContactMessage::query()->sole();
        $this->assertSame($client->id, $message->user_id);
        $this->assertSame('client', $message->account_type);
        $this->assertStringStartsWith('FB-', $message->reference);
        Notification::assertSentOnDemand(SupportMessageReceived::class);
    }

    public function test_only_platform_admins_with_support_permission_read_the_inbox(): void
    {
        $message = ContactMessage::create(['name' => 'A', 'email' => 'a@example.com', 'subject' => 'Hi', 'body' => 'Hello there team']);
        $admin = User::factory()->platform()->create();
        $admin->assignRole('admin');
        $officer = User::factory()->platform()->create();
        $officer->assignRole('verification-officer');

        $this->actingAs($admin)->get(route('admin.feedback.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('Admin/Support')->has('messages.data', 1));
        $this->actingAs($officer)->get(route('admin.feedback.index'))->assertForbidden();
        $this->actingAs($this->lawyer())->get(route('admin.feedback.index'))->assertForbidden();

        $this->actingAs($admin)->put(route('admin.feedback.update', $message), ['status' => 'resolved', 'admin_note' => 'Answered by email'])->assertSessionHasNoErrors();
        $message->refresh();
        $this->assertSame('resolved', $message->status->value);
        $this->assertSame($admin->id, $message->handled_by);
        $this->assertNotNull($message->handled_at);
    }

    public function test_the_honeypot_rejects_bots(): void
    {
        $this->post(route('contact.submit'), ['name' => 'Bot', 'email' => 'bot@example.com', 'subject' => 'x', 'body' => 'buy things now please', 'website' => 'spam'])
            ->assertSessionHasErrors('website');
        $this->assertDatabaseCount('contact_messages', 0);
    }
}
