<?php

namespace Tests\Feature\Admin;

use App\Models\Setting;
use App\Models\User;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_whatsapp_settings_and_secrets_are_encrypted(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        $this->actingAs($admin)->put(route('admin.whatsapp-settings.update'), [
            'enabled' => '1',
            'display_name' => 'Wakeel Diary Alerts',
            'phone_number_id' => '123456789',
            'api_version' => 'v21.0',
            'token' => 'access-token-123',
            'app_secret' => 'app-secret-123',
            'verify_token' => 'verify-token-123',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('1', Setting::get('whatsapp_enabled'));
        $this->assertSame('Wakeel Diary Alerts', Setting::get('whatsapp_display_name'));
        $this->assertSame('123456789', Setting::get('whatsapp_phone_number_id'));
        $this->assertSame('access-token-123', Setting::getSecret('whatsapp_token'));
        $this->assertSame('app-secret-123', Setting::getSecret('whatsapp_app_secret'));
        $this->assertSame('verify-token-123', Setting::getSecret('whatsapp_verify_token'));

        $stored = (string) Setting::query()->where('key', 'whatsapp_token')->value('value');
        $this->assertStringStartsWith('enc:', $stored);
        $this->assertStringNotContainsString('access-token-123', $stored);

        $client = app(WhatsAppClient::class);
        $this->assertTrue($client->isConfigured());
        $this->assertSame('Wakeel Diary Alerts', $client->displayName());
    }

    public function test_whatsapp_client_prefers_saved_settings_over_environment(): void
    {
        config([
            'services.whatsapp.token' => 'env-token',
            'services.whatsapp.phone_number_id' => 'env-phone',
            'services.whatsapp.app_secret' => 'env-secret',
            'services.whatsapp.verify_token' => 'env-verify',
        ]);

        Setting::put('whatsapp_enabled', '1');
        Setting::put('whatsapp_phone_number_id', 'db-phone');
        Setting::putSecret('whatsapp_token', 'db-token');
        Setting::putSecret('whatsapp_app_secret', 'db-secret');
        Setting::putSecret('whatsapp_verify_token', 'db-verify');

        $client = app(WhatsAppClient::class);

        $this->assertTrue($client->isConfigured());
        $this->assertSame('db-verify', $client->verifyToken());
        $this->assertTrue($client->signatureIsValid('payload', 'sha256='.hash_hmac('sha256', 'payload', 'db-secret')));
        $this->assertFalse($client->signatureIsValid('payload', 'sha256='.hash_hmac('sha256', 'payload', 'env-secret')));
    }

    public function test_disabled_whatsapp_is_not_configured_even_with_credentials(): void
    {
        Setting::put('whatsapp_enabled', '0');
        Setting::put('whatsapp_phone_number_id', 'db-phone');
        Setting::putSecret('whatsapp_token', 'db-token');

        $client = app(WhatsAppClient::class);

        $this->assertFalse($client->isEnabled());
        $this->assertFalse($client->isConfigured());
    }

    public function test_blank_secret_keeps_existing_value_and_clear_removes_it(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');
        Setting::putSecret('whatsapp_token', 'keep-me');

        $payload = [
            'enabled' => '1',
            'display_name' => 'Wakeel Diary',
            'phone_number_id' => '123',
            'api_version' => 'v21.0',
            'token' => '',
        ];

        $this->actingAs($admin)->put(route('admin.whatsapp-settings.update'), $payload)->assertSessionHasNoErrors();
        $this->assertSame('keep-me', Setting::getSecret('whatsapp_token'));

        $this->actingAs($admin)->put(route('admin.whatsapp-settings.update'), [...$payload, 'clear_token' => true])->assertSessionHasNoErrors();
        $this->assertNull(Setting::getSecret('whatsapp_token'));
    }

    public function test_webhook_verification_accepts_the_saved_verify_token(): void
    {
        config(['services.whatsapp.verify_token' => null]);
        Setting::putSecret('whatsapp_verify_token', 'saved-verify-token');

        $this->get(route('webhooks.whatsapp.verify', [
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'saved-verify-token',
            'hub_challenge' => 'challenge-123',
        ]))->assertOk()->assertSee('challenge-123');

        $this->get(route('webhooks.whatsapp.verify', [
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'wrong-token',
            'hub_challenge' => 'challenge-123',
        ]))->assertForbidden();
    }
}
