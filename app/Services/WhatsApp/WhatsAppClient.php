<?php

namespace App\Services\WhatsApp;

use App\Models\Setting;
use App\Models\WhatsAppTemplate;
use App\Services\WhatsApp\Contracts\WhatsAppProvider;
use App\Services\WhatsApp\Providers\GreenApiProvider;
use App\Services\WhatsApp\Providers\MetaCloudProvider;
use RuntimeException;

/**
 * Entry point for all WhatsApp sending (docs/Features/WhatsApp.md#providers). Admin picks one active
 * provider in Settings, WhatsApp (`whatsapp_provider` = meta | green_api); notification code only calls
 * this class, so switching providers needs no change anywhere else. Secrets stay encrypted in settings
 * and are never returned to the browser.
 */
class WhatsAppClient
{
    public const PROVIDERS = ['meta', 'green_api'];

    public function __construct(private MetaCloudProvider $meta, private GreenApiProvider $greenApi) {}

    public function isEnabled(): bool
    {
        return Setting::get('whatsapp_enabled', '1') !== '0';
    }

    public function activeKey(): string
    {
        $key = Setting::get('whatsapp_provider') ?: 'meta';

        return in_array($key, self::PROVIDERS, true) ? $key : 'meta';
    }

    public function provider(?string $key = null): WhatsAppProvider
    {
        return match ($key ?? $this->activeKey()) {
            'green_api' => $this->greenApi,
            default => $this->meta,
        };
    }

    public function meta(): MetaCloudProvider
    {
        return $this->meta;
    }

    public function greenApi(): GreenApiProvider
    {
        return $this->greenApi;
    }

    /** Enabled and the active provider has its credentials. */
    public function isConfigured(): bool
    {
        return $this->isEnabled() && $this->provider()->isConfigured();
    }

    /** The business profile name clients see as the sender. */
    public function displayName(): string
    {
        return Setting::get('whatsapp_display_name') ?: (string) config('app.name');
    }

    /**
     * The template to send for an event key in the recipient's language (English fallback), limited to
     * statuses the active provider may send.
     */
    public function templateFor(string $key, string $locale): ?WhatsAppTemplate
    {
        return WhatsAppTemplate::query()->where('key', $key)->whereIn('status', $this->provider()->usableTemplateStatuses())
            ->whereIn('language', [$locale, 'en'])->orderByRaw('language = ? DESC', [$locale])->first();
    }

    /**
     * Sends through the active provider and returns the provider message id.
     *
     * @param  list<string>  $variables
     */
    public function send(string $to, WhatsAppTemplate $template, array $variables): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('WhatsApp is not configured.');
        }

        return $this->provider()->send($to, $template, $variables);
    }

    /** Meta webhook handshake token. */
    public function verifyToken(): ?string
    {
        return $this->meta->settings()['verify_token'];
    }

    public function signatureIsValid(string $payload, ?string $signature): bool
    {
        return $this->meta->signatureIsValid($payload, $signature);
    }
}
