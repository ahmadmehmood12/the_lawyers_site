<?php

namespace App\Services\WhatsApp\Contracts;

use App\Models\WhatsAppTemplate;

/**
 * One WhatsApp sending backend (docs/Features/WhatsApp.md#providers). Only the active provider sends;
 * notification code never talks to a provider directly, it goes through WhatsAppClient.
 */
interface WhatsAppProvider
{
    /** Stable key stored on settings and deliveries: meta | green_api. */
    public function key(): string;

    public function label(): string;

    /** Credentials present (not proof they work; see testConnection). */
    public function isConfigured(): bool;

    /** Template statuses this provider may send (Meta needs Meta approval; Green-API sends our own text). */
    public function usableTemplateStatuses(): array;

    /**
     * Sends the template to a number (international format, digits) and returns the provider message id.
     *
     * @param  list<string>  $variables  body values for {{1}}, {{2}}…
     */
    public function send(string $to, WhatsAppTemplate $template, array $variables): string;

    /** @return array{ok: bool, message: string} live check against the provider, no message sent */
    public function testConnection(): array;
}
