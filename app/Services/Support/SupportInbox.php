<?php

namespace App\Services\Support;

use App\Enums\SupportMessageKind;
use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\SupportMessageReceived;
use App\Rules\PakistaniPhone;
use Illuminate\Support\Facades\Notification;

/**
 * Stores a contact or feedback message and acknowledges it to the sender by
 * email, and by WhatsApp only when they gave a number and agreed to it.
 */
class SupportInbox
{
    /**
     * @param  array{name: string, email: string, phone?: string|null, subject: string, body: string, category?: string|null, whatsapp_consent?: bool}  $data
     */
    public function receive(SupportMessageKind $kind, array $data, ?User $user = null): ContactMessage
    {
        $phone = PakistaniPhone::normalize($data['phone'] ?? null);

        $message = ContactMessage::create([
            'kind' => $kind,
            'user_id' => $user?->id,
            'account_type' => $user?->account_type->value,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $phone,
            'whatsapp_consent' => $phone !== null && (bool) ($data['whatsapp_consent'] ?? false),
            'locale' => app()->getLocale(),
            'subject' => $data['subject'],
            'category' => $data['category'] ?? null,
            'body' => $data['body'],
        ]);

        $message->update(['reference' => sprintf('%s-%s-%05d', $kind->prefix(), now()->year, $message->id)]);

        $route = Notification::route('mail', $message->email);
        if ($message->whatsapp_consent) {
            $route->route('whatsapp', $message->phone);
        }
        $route->notify((new SupportMessageReceived($message))->locale($message->locale));

        return $message;
    }
}
