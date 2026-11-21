<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Services\Mobile\PushSender;

/**
 * Mobile push for every PlatformNotification: the same title/body as the in-app notification,
 * plus {event, url, notification_id} so the app can open the right screen when tapped.
 */
class PushChannel
{
    public function __construct(private PushSender $sender) {}

    public function send(object $notifiable, PlatformNotification $notification): void
    {
        if (! $notifiable instanceof User || ! $notifiable->fcm_token) {
            return;
        }

        $content = $notification->content($notifiable);

        $this->sender->send($notifiable, (string) $content['title'], (string) $content['body'], [
            'event' => $notification->event(),
            'url' => $content['url'] ?? null,
            'notification_id' => $notification->id,
        ]);
    }
}
