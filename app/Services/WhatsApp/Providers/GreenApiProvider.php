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
 * Green-API (https://green-api.com/en/docs/). Sends plain text through a linked WhatsApp account:
 * POST {apiUrl}/waInstance{idInstance}/sendMessage/{apiTokenInstance} with chatId "<digits>@c.us".
 * There is no Meta template approval, so our own template text (body_preview with {{1}}… filled in) is
 * sent; disabled or rejected templates are never sent. The token is part of the URL, so every error
 * message is redacted before it is stored or logged.
 */
class GreenApiProvider implements WhatsAppProvider
{
    public const DEFAULT_API_URL = 'https://api.green-api.com';

    /** WhatsApp text limit documented by Green-API. */
    private const MAX_LENGTH = 20000;

    public function key(): string
    {
        return 'green_api';
    }

    public function label(): string
    {
        return 'Green-API';
    }

    /** @return array{api_url: string, id_instance: ?string, token: ?string, webhook_token: ?string} */
    public function settings(): array
    {
        return [
            'api_url' => rtrim(Setting::get('green_api_url') ?: (string) config('services.green_api.api_url', self::DEFAULT_API_URL), '/'),
            'id_instance' => Setting::get('green_api_id_instance') ?: config('services.green_api.id_instance'),
            'token' => Setting::getSecret('green_api_token') ?: config('services.green_api.token'),
            'webhook_token' => Setting::getSecret('green_api_webhook_token') ?: config('services.green_api.webhook_token'),
        ];
    }

    public function isConfigured(): bool
    {
        $s = $this->settings();

        return filled($s['id_instance']) && filled($s['token']);
    }

    public function usableTemplateStatuses(): array
    {
        return ['approved', 'pending'];
    }

    public function send(string $to, WhatsAppTemplate $template, array $variables): string
    {
        $s = $this->settings();

        if (! $this->isConfigured()) {
            throw new RuntimeException('Green-API is not configured.');
        }

        try {
            $response = Http::acceptJson()->asJson()->timeout(20)->retry(2, 800, throw: false)
                ->post($this->url('sendMessage'), [
                    'chatId' => preg_replace('/\D+/', '', $to).'@c.us',
                    'message' => mb_substr(self::render($template->body_preview, $variables), 0, self::MAX_LENGTH),
                    'linkPreview' => false,
                ])->throw();
        } catch (Throwable $e) {
            throw new RuntimeException(SecretRedactor::clean($e->getMessage(), [$s['token']]), 0);
        }

        $id = (string) $response->json('idMessage');

        if ($id === '') {
            throw new RuntimeException('Green-API accepted the request but returned no idMessage.');
        }

        return $id;
    }

    public function testConnection(): array
    {
        $s = $this->settings();

        if (! $this->isConfigured()) {
            return ['ok' => false, 'message' => __('Add the instance ID and API token first.')];
        }

        try {
            $response = Http::acceptJson()->timeout(10)->get($this->url('getStateInstance'));
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => SecretRedactor::clean($e->getMessage(), [$s['token']])];
        }

        if ($response->failed()) {
            return ['ok' => false, 'message' => __('Green-API answered :status. Check the instance ID, API token and API URL.', ['status' => $response->status()])];
        }

        $state = (string) $response->json('stateInstance');

        return match ($state) {
            'authorized' => ['ok' => true, 'message' => __('Connected. The WhatsApp account is authorized and ready to send.')],
            'notAuthorized' => ['ok' => false, 'message' => __('The instance is not authorized. Scan the QR code in the Green-API console with the WhatsApp phone.')],
            'blocked' => ['ok' => false, 'message' => __('This WhatsApp account is blocked. Messages cannot be sent.')],
            'sleepMode' => ['ok' => false, 'message' => __('The phone is off or offline (sleep mode). Turn it on; it can take up to 5 minutes.')],
            'starting' => ['ok' => false, 'message' => __('The instance is starting. Try again in a few minutes.')],
            'suspended', 'yellowCard' => ['ok' => false, 'message' => __('Temporary restrictions are on this account. Pause sending and try later.')],
            default => ['ok' => false, 'message' => __('Unexpected state: :state', ['state' => $state ?: 'none'])],
        };
    }

    /** Checks the Authorization header Green-API sends when webhookUrlToken is set ("Bearer <token>"). */
    public function webhookAuthorized(?string $header): bool
    {
        $expected = $this->settings()['webhook_token'];

        if (blank($expected) || blank($header)) {
            return false;
        }

        $given = preg_replace('/^(Bearer|Basic)\s+/i', '', trim($header));
        $wanted = preg_replace('/^(Bearer|Basic)\s+/i', '', trim($expected));

        return hash_equals($wanted, (string) $given);
    }

    /** Fills {{1}}, {{2}}… in our template text. */
    public static function render(string $body, array $variables): string
    {
        return preg_replace_callback('/\{\{\s*(\d+)\s*\}\}/', fn ($m) => (string) ($variables[(int) $m[1] - 1] ?? ''), $body) ?? $body;
    }

    private function url(string $method): string
    {
        $s = $this->settings();

        return sprintf('%s/waInstance%s/%s/%s', $s['api_url'], $s['id_instance'], $method, $s['token']);
    }
}
