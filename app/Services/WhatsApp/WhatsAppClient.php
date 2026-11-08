<?php

namespace App\Services\WhatsApp;

use App\Models\Setting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for the official WhatsApp Business Cloud API (template messages only —
 * business-initiated messages outside the 24h window require approved templates).
 *
 * Credentials are read from the admin panel settings first, falling back to the
 * server environment so existing deployments keep working. Secrets are stored
 * encrypted and never returned to the browser.
 */
class WhatsAppClient
{
    /** @return array{enabled: bool, token: ?string, phone_number_id: ?string, app_secret: ?string, verify_token: ?string, api_version: string, base_url: string, display_name: string} */
    private function settings(): array
    {
        return [
            'enabled' => Setting::get('whatsapp_enabled', '1') !== '0',
            'token' => Setting::getSecret('whatsapp_token') ?: config('services.whatsapp.token'),
            'phone_number_id' => Setting::get('whatsapp_phone_number_id') ?: config('services.whatsapp.phone_number_id'),
            'app_secret' => Setting::getSecret('whatsapp_app_secret') ?: config('services.whatsapp.app_secret'),
            'verify_token' => Setting::getSecret('whatsapp_verify_token') ?: config('services.whatsapp.verify_token'),
            'api_version' => Setting::get('whatsapp_api_version') ?: config('services.whatsapp.api_version'),
            'base_url' => config('services.whatsapp.base_url'),
            'display_name' => Setting::get('whatsapp_display_name') ?: config('app.name'),
        ];
    }

    public function isEnabled(): bool
    {
        return $this->settings()['enabled'];
    }

    public function isConfigured(): bool
    {
        $settings = $this->settings();

        return $settings['enabled'] && filled($settings['token']) && filled($settings['phone_number_id']);
    }

    /** The business profile name clients see as the sender. */
    public function displayName(): string
    {
        return $this->settings()['display_name'];
    }

    public function verifyToken(): ?string
    {
        return $this->settings()['verify_token'];
    }

    /**
     * Sends an approved template and returns the provider message id.
     *
     * @param  list<string>  $variables  body parameters in order ({{1}}, {{2}}…)
     *
     * @throws RuntimeException|RequestException|ConnectionException
     */
    public function sendTemplate(string $to, string $template, string $language, array $variables): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('WhatsApp is not configured.');
        }

        $settings = $this->settings();
        $url = sprintf('%s/%s/%s/messages', rtrim($settings['base_url'], '/'), $settings['api_version'], $settings['phone_number_id']);

        $response = Http::withToken($settings['token'])
            ->acceptJson()->timeout(15)->retry(2, 500, throw: false)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => ltrim($to, '+'),
                'type' => 'template',
                'template' => [
                    'name' => $template,
                    'language' => ['code' => $language],
                    'components' => $variables === [] ? [] : [[
                        'type' => 'body',
                        'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => mb_substr((string) $v, 0, 1000)], $variables),
                    ]],
                ],
            ]);

        $response->throw();

        return (string) $response->json('messages.0.id');
    }

    /** Validates Meta's X-Hub-Signature-256 header against the raw body. */
    public function signatureIsValid(string $payload, ?string $signature): bool
    {
        $secret = $this->settings()['app_secret'];

        if (! $secret || ! $signature || ! str_starts_with($signature, 'sha256=')) {
            return false;
        }

        return hash_equals('sha256='.hash_hmac('sha256', $payload, $secret), $signature);
    }
}
