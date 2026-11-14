<?php

namespace App\Notifications\Channels;

use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Services\WhatsApp\SecretRedactor;
use App\Services\WhatsApp\WhatsAppClient;
use App\Services\WhatsApp\WhatsAppConsent;
use Illuminate\Notifications\AnonymousNotifiable;
use RuntimeException;
use Throwable;

/**
 * Laravel notification channel for WhatsApp, provider independent (docs/Features/WhatsApp.md).
 *
 * Every attempt is a row in notification_deliveries. The unique dedupe key (per notification and
 * recipient) makes queue retries idempotent and stops a message from going out twice when the admin
 * switches provider mid retry: once a row is sent, delivered or read, it is never sent again.
 * Consent is checked here, at send time, not only when the job was queued.
 */
class WhatsAppChannel
{
    public function __construct(private WhatsAppClient $client, private WhatsAppConsent $consent) {}

    public function send(object $notifiable, PlatformNotification $notification): void
    {
        $spec = $notification->whatsAppTemplate($notifiable);
        $to = $notifiable instanceof AnonymousNotifiable ? $notifiable->routeNotificationFor('whatsapp') : $notifiable->routeNotificationFor('WhatsApp');

        if (! $spec || ! $to) {
            return;
        }

        $locale = $notifiable instanceof User ? $notifiable->preferredLocale() : ($spec['locale'] ?? 'en');
        $template = $this->client->templateFor($spec['key'], $locale);

        $delivery = NotificationDelivery::query()->firstOrCreate(
            ['dedupe_key' => $spec['dedupe'] ?? ('wa:'.$notification->id.':'.$to)],
            [
                'channel' => NotificationChannel::WhatsApp,
                'provider' => $this->client->activeKey(),
                'event' => $notification->event(),
                'subject_type' => $spec['subject']?->getMorphClass(),
                'subject_id' => $spec['subject']?->getKey(),
                'organization_id' => $spec['organization_id'] ?? null,
                'user_id' => $notifiable instanceof User ? $notifiable->id : null,
                'client_id' => $spec['client_id'] ?? null,
                'recipient' => $to,
                'template' => $template?->name,
                'status' => DeliveryStatus::Queued,
            ],
        );

        if (in_array($delivery->status, [DeliveryStatus::Sent, DeliveryStatus::Delivered, DeliveryStatus::Read, DeliveryStatus::Skipped], true)) {
            return;
        }

        $blocked = $this->consent->blockReason($notifiable, $spec, $notification->event());
        $reason = match (true) {
            $blocked !== null => $blocked,
            ! $this->client->isEnabled() => 'disabled',
            ! $this->client->isConfigured() => 'not_configured',
            $template === null => 'no_usable_template',
            default => null,
        };

        if ($reason !== null) {
            $delivery->update(['status' => DeliveryStatus::Skipped, 'error' => $reason, 'provider' => $this->client->activeKey()]);

            return;
        }

        $provider = $this->client->activeKey();
        $delivery->increment('attempts');

        try {
            $id = $this->client->send($to, $template, array_map('strval', $spec['variables'] ?? []));
            $delivery->update(['status' => DeliveryStatus::Sent, 'provider' => $provider, 'template' => $template->name, 'provider_message_id' => $id, 'sent_at' => now(), 'error' => null]);
        } catch (Throwable $e) {
            $message = SecretRedactor::clean($e->getMessage(), []);
            $delivery->update(['status' => DeliveryStatus::Failed, 'provider' => $provider, 'error' => $message]);

            throw new RuntimeException($message, 0); // the queue retries with backoff; no secrets in the job log
        }
    }
}
