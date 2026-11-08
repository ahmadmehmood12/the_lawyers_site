<?php

namespace Tests\Feature\Workflows;

use App\Models\Conversation;
use App\Models\DocumentTemplate;
use App\Models\Draft;
use App\Models\LegalCase;
use App\Models\User;
use App\Services\Ai\Redactor;
use App\Support\HtmlSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MessagingAndDraftingTest extends TestCase
{
    use RefreshDatabase;

    public function test_lawyer_and_client_message_and_outsider_is_blocked(): void
    {
        Notification::fake();
        $lawyer = $this->lawyer();
        [$clientUser, $client] = $this->clientUserFor($this->org($lawyer));

        $this->actingAs($lawyer)->post(route('messages.store'), ['client_id' => $client->id])->assertRedirect();
        $conversation = Conversation::query()->sole();
        $this->actingAs($lawyer)->post(route('messages.send', $conversation), ['body' => 'Hearing is on Monday.'])->assertSessionHasNoErrors();
        $this->actingAs($clientUser)->get(route('portal.messages.show', $conversation))->assertOk()->assertSee('Hearing is on Monday.');

        $this->assertNotSame('Hearing is on Monday.', \DB::table('messages')->value('body'), 'message bodies are encrypted at rest');
        $this->actingAs(User::factory()->client()->create())->get(route('portal.messages.show', $conversation))->assertNotFound();
        $this->actingAs($this->lawyer())->get(route('messages.show', $conversation))->assertNotFound();
    }

    public function test_draft_from_template_fills_placeholders_and_versions(): void
    {
        $lawyer = $this->lawyer();
        $organization = $this->org($lawyer);
        [, $client] = $this->clientUserFor($organization);
        $client->update(['name' => 'Ali Raza']);
        $case = LegalCase::factory()->create(['organization_id' => $organization->id, 'fir_number' => '99/2026']);
        $case->clients()->attach($client->id);
        $template = DocumentTemplate::query()->where('title', 'Post-Arrest Bail Application')->sole();
        $this->actingAs($lawyer);

        $this->post(route('drafts.store'), ['title' => 'Bail', 'document_template_id' => $template->id, 'legal_case_id' => $case->id, 'language' => 'en'])->assertRedirect();
        $draft = Draft::query()->sole();
        $this->assertStringContainsString('Ali Raza', $draft->body);
        $this->assertStringContainsString('99/2026', $draft->body);
        $this->assertStringContainsString('data-placeholder="case.police_station"', $draft->body);

        $this->put(route('drafts.update', $draft), ['title' => 'Bail', 'body' => '<p>Revised</p><script>alert(1)</script>'])->assertSessionHasNoErrors();
        $draft->refresh();
        $this->assertSame(2, $draft->version);
        $this->assertStringNotContainsString('<script', $draft->body);
        $this->get(route('drafts.export', [$draft, 'pdf']))->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->get(route('drafts.export', [$draft, 'docx']))->assertOk();
    }

    public function test_sanitizer_strips_dangerous_markup(): void
    {
        $clean = HtmlSanitizer::clean('<p onclick="x()">Hi<a href="javascript:alert(1)">link</a><img src=x onerror=1><iframe src="//evil"></iframe><span class="placeholder evil">{{a}}</span></p>');

        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
        $this->assertStringNotContainsString('<iframe', $clean);
        $this->assertStringNotContainsString('onerror', $clean);
        $this->assertStringContainsString('class="placeholder"', $clean);
    }

    public function test_ai_endpoint_reports_unavailable_without_provider(): void
    {
        $lawyer = $this->lawyer();

        $this->actingAs($lawyer)->postJson(route('ai.run'), ['feature' => 'summarize', 'input' => 'Summarize this pleading please.'])->assertStatus(503);
    }

    public function test_ai_redactor_masks_identifiers(): void
    {
        $r = new Redactor;
        $out = $r->redact('Ali Raza, CNIC 35202-1234567-1, phone 03001234567, ali@example.com', ['Ali Raza']);

        $this->assertStringNotContainsString('35202', $out);
        $this->assertStringNotContainsString('0300', $out);
        $this->assertStringNotContainsString('Ali Raza', $out);
        $this->assertStringContainsString('Ali Raza', $r->restore($out));
    }
}
