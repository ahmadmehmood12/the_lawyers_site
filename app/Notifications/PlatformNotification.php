<?php

namespace App\Notifications;

use App\Enums\NotificationChannel;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Base for all user notifications (docs/Modules/Notifications.md).
 *  - Always queued; never blocks a request.
 *  - Channels are filtered by the user's notification_preferences per event
 *    (in-app and email default ON; WhatsApp requires an explicit opt-in row).
 *  - Rendered in the recipient's locale (User implements preferredLocale()).
 */
abstract class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** Preference event key, e.g. hearing_reminder. */
    abstract public function event(): string;

    /** @return array{title: string, body: string, url?: string|null, icon?: string} */
    abstract public function content(object $notifiable): array;

    /** WhatsApp template key + ordered variables, or null if not sent on WhatsApp. */
    public function whatsAppTemplate(object $notifiable): ?array
    {
        return null;
    }

    /**
     * @return list<string|class-string>
     */
    public function via(object $notifiable): array
    {
        if (! $notifiable instanceof User) {
            return ['mail'];
        }

        $preferences = $notifiable->notificationPreferences()->where('event', $this->event())->pluck('enabled', 'channel');
        $enabled = fn (NotificationChannel $c, bool $default) => (bool) ($preferences[$c->value] ?? $default);
        $channels = [];

        if ($enabled(NotificationChannel::InApp, true)) {
            $channels[] = 'database';
        }

        if ($enabled(NotificationChannel::Email, true) && $notifiable->email) {
            $channels[] = 'mail';
        }

        if ($this->whatsAppTemplate($notifiable) && $enabled(NotificationChannel::WhatsApp, false) && $notifiable->phone) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [...$this->content($notifiable), 'event' => $this->event()];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $content = $this->content($notifiable);
        $mail = (new MailMessage)->subject($content['title'])->line($content['body']);

        return isset($content['url']) && $content['url'] ? $mail->action(__('Open'), $content['url']) : $mail;
    }
}
