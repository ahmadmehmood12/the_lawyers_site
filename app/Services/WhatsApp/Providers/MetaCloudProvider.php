<?php

namespace App\Services\WhatsApp\Providers;

use App\Models\Setting;
use App\Models\WhatsAppTemplate;
use App\Services\WhatsApp\Contracts\WhatsAppProvider;
use App\Services\WhatsApp\SecretRedactor;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Official WhatsApp Business Cloud API (Meta). Business initiated messages must use templates that Meta
 * has approved, so only `approved` templates are sendable. Credentials: admin settings first, then .env.
 */
class MetaCloudProvider implements WhatsAppProvider
{
    public function key(): string
    {
        return 'meta';
    }

    public function label(): string
    {
        return 'Meta WhatsApp Cloud API';
    }

    /** @return array{token: ?string, phone_number_id: ?string, app_secret: ?string, verify_token: ?string, api_version: string, base_url: string} */
    public function settings(): array
    {
        return [
            'token' => Setting::getSecret('whatsapp_token') ?: config('services.whatsapp.token'),
            'phone_number_id' => Setting::get('whatsapp_phone_number_id') ?: config('services.whatsapp.phone_number_id'),
            'app_secret' => Setting::getSecret('whatsapp_app_secret') ?: config('services.whatsapp.app_secret'),
            'verify_token' => Setting::getSecret('whatsapp_verify_token') ?: config('services.whatsapp.verify_token'),
            'api_version' => Setting::get('whatsapp_api_version') ?: (string) config('services.whatsapp.api_version'),
            'base_url' => rtrim((string) config('services.whatsapp.base_url'), '/'),
        ];
    }

    public function isConfigured(): bool
    {
        $s = $this->settings();

        return filled($s['token']) && filled($s['phone_number_id']);
    }

    public function usableTemplateStatuses(): array
    {
        return ['approved'];
    }

    public function send(string $to, WhatsAppTemplate $template, array $variables): string
    {
        $s = $this->settings();

        if (! $this->isConfigured()) {
            throw new RuntimeException('Meta WhatsApp is not configured.');
        }

        try {
            $response = Http::withToken($s['token'])->acceptJson()->timeout(15)->retry(2, 500, throw: false)
                ->post("{$s['base_url']}/{$s['api_version']}/{$s['phone_number_id']}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to' => ltrim($to, '+'),
                    'type' => 'template',
                    'template' => [
                        'name' => $template->name,
                        'language' => ['code' => $template->language],
                        'components' => $variables === [] ? [] : [[
                            'type' => 'body',
                            'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => mb_substr((string) $v, 0, 1000)], $variables),
                        ]],
                    ],
                ])->throw();
        } catch (Throwable $e) {
            throw new RuntimeException(SecretRedactor::clean($e->getMessage(), [$s['token']]), 0);
        }

        $id = (string) $response->json('messages.0.id');

        if ($id === '') {
            throw new RuntimeException('Meta accepted the request but returned no message id.');
        }

        return $id;
    }

    public function testConnection(): array
    {
        $s = $this->settings();

        if (! $this->isConfigured()) {
            return ['ok' => false, 'message' => __('Add the access token and phone number ID first.')];
        }

        try {
            $response = Http::withToken($s['token'])->acceptJson()->timeout(10)
                ->get("{$s['base_url']}/{$s['api_version']}/{$s['phone_number_id']}", ['fields' => 'display_phone_number,verified_name,quality_rating']);
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => SecretRedactor::clean($e->getMessage(), [$s['token']])];
        }

        if ($response->failed()) {
            return ['ok' => false, 'message' => __('Meta answered :status: :error', ['status' => $response->status(), 'error' => (string) ($response->json('error.message') ?? 'error')])];
        }

        return ['ok' => true, 'message' => __('Connected to :name (:number), quality :quality.', [
            'name' => (string) $response->json('verified_name', '—'),
            'number' => (string) $response->json('display_phone_number', '—'),
            'quality' => (string) $response->json('quality_rating', 'unknown'),
        ])];
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
