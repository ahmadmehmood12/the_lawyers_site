<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\User;

/** Never includes the message body in mail or push — only that a message arrived. */
class NewMessage extends PlatformNotification
{
    public function __construct(public Message $message, public User $sender, public bool $forClient) {}

    public function event(): string
    {
        return 'message';
    }

    public function content(object $notifiable): array
    {
        return [
            'title' => __('New message from :name', ['name' => $this->sender->name]),
            'body' => __('Sign in to read it securely.'),
            'url' => route($this->forClient ? 'portal.messages.show' : 'messages.show', $this->message->conversation_id),
            'icon' => 'message',
        ];
    }
}
