<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for the official WhatsApp Business Cloud API (template messages only —
 * business-initiated messages outside the 24h window require approved templates).
 */
class WhatsAppClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.whatsapp.token')) && filled(config('services.whatsapp.phone_number_id'));
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

        $url = sprintf('%s/%s/%s/messages', rtrim(config('services.whatsapp.base_url'), '/'), config('services.whatsapp.api_version'), config('services.whatsapp.phone_number_id'));

        $response = Http::withToken(config('services.whatsapp.token'))
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
        $secret = config('services.whatsapp.app_secret');

        if (! $secret || ! $signature || ! str_starts_with($signature, 'sha256=')) {
            return false;
        }

        return hash_equals('sha256='.hash_hmac('sha256', $payload, $secret), $signature);
    }
}
