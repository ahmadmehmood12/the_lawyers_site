<?php

namespace App\Notifications\Channels;

use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Models\WhatsAppTemplate;
use App\Notifications\PlatformNotification;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Notifications\AnonymousNotifiable;
use Throwable;

/**
 * Laravel notification channel for WhatsApp templates.
 * Records every attempt in notification_deliveries; a unique dedupe key
 * (notification id + recipient) makes queue retries idempotent.
 */
class WhatsAppChannel
{
    public function __construct(private WhatsAppClient $client) {}

    public function send(object $notifiable, PlatformNotification $notification): void
    {
        $spec = $notification->whatsAppTemplate($notifiable);
        $to = $notifiable instanceof AnonymousNotifiable ? $notifiable->routeNotificationFor('whatsapp') : $notifiable->routeNotificationFor('WhatsApp');

        if (! $spec || ! $to) {
            return;
        }

        $locale = $notifiable instanceof User ? $notifiable->preferredLocale() : ($spec['locale'] ?? 'en');
        $template = WhatsAppTemplate::query()->where('key', $spec['key'])->where('status', 'approved')
            ->whereIn('language', [$locale, 'en'])->orderByRaw('language = ? DESC', [$locale])->first();

        $delivery = NotificationDelivery::query()->firstOrCreate(
            ['dedupe_key' => $spec['dedupe'] ?? ('wa:'.$notification->id.':'.$to)],
            [
                'channel' => NotificationChannel::WhatsApp,
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

        if (! $this->client->isConfigured() || ! $template) {
            $delivery->update(['status' => DeliveryStatus::Skipped, 'error' => ! $this->client->isConfigured() ? 'not_configured' : 'no_approved_template']);

            return;
        }

        $delivery->increment('attempts');

        try {
            $id = $this->client->sendTemplate($to, $template->name, $template->language, $spec['variables']);
            $delivery->update(['status' => DeliveryStatus::Sent, 'provider_message_id' => $id, 'sent_at' => now(), 'error' => null]);
        } catch (Throwable $e) {
            $delivery->update(['status' => DeliveryStatus::Failed, 'error' => mb_substr($e->getMessage(), 0, 500)]);

            throw $e; // let the queue retry with backoff
        }
    }
}
