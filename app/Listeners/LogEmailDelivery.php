<?php

namespace App\Listeners;

use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Queue\Events\JobFailed;
use Throwable;

/**
 * Email delivery log (docs/Features/Email-Templates.md). WhatsApp logs itself in its channel;
 * this records the email side in the same notification_deliveries table so Admin,
 * Notifications shows sent and failed email too.
 *  - sent: NotificationSent for the mail channel (one row per notification and recipient).
 *  - failed: a queued notification job for the mail channel that exhausted its retries.
 */
class LogEmailDelivery
{
    public function sent(NotificationSent $event): void
    {
        if ($event->channel !== 'mail' || ! $event->notification instanceof PlatformNotification) {
            return;
        }

        $this->record($event->notifiable, $event->notification, DeliveryStatus::Sent, null);
    }

    public function failed(JobFailed $event): void
    {
        try {
            $command = unserialize($event->job->payload()['data']['command'] ?? '');
        } catch (Throwable) {
            return;
        }

        if (! $command instanceof SendQueuedNotifications || ! in_array('mail', (array) $command->channels, true) || ! $command->notification instanceof PlatformNotification) {
            return;
        }

        foreach ($command->notifiables as $notifiable) {
            $this->record($notifiable, $command->notification, DeliveryStatus::Failed, mb_substr($event->exception->getMessage(), 0, 500));
        }
    }

    private function record(object $notifiable, PlatformNotification $notification, DeliveryStatus $status, ?string $error): void
    {
        $address = $notifiable instanceof AnonymousNotifiable ? $notifiable->routeNotificationFor('mail') : ($notifiable->email ?? null);
        $recipient = is_array($address) ? (string) array_key_first($address) : (string) $address;
        if ($recipient === '') {
            return;
        }

        NotificationDelivery::query()->updateOrCreate(
            ['dedupe_key' => 'mail:'.$notification->id.':'.$recipient],
            [
                'channel' => NotificationChannel::Email,
                'event' => $notification->mailTemplateKey(),
                'user_id' => $notifiable instanceof User ? $notifiable->id : null,
                'recipient' => $recipient,
                'template' => $notification->mailTemplateKey(),
                'status' => $status,
                'error' => $error,
                'attempts' => 1,
                'sent_at' => $status === DeliveryStatus::Sent ? now() : null,
            ],
        );
    }
}
