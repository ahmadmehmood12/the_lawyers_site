<?php

namespace App\Services\WhatsApp;

use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\NotificationPreference;
use App\Models\User;

/**
 * WhatsApp consent (docs/Features/WhatsApp.md#consent). Nothing is sent on WhatsApp unless the person
 * explicitly agreed, and the check runs again right before every send, so a withdrawal made after a
 * job was queued still stops it.
 *
 *  - Account holders (lawyers, staff, portal clients): users.whatsapp_consent_* plus the per event
 *    WhatsApp preference.
 *  - Clients without an account: clients.whatsapp_consent_* recorded by their lawyer.
 *  - Contact and feedback senders: the consent box they ticked on that message.
 */
class WhatsAppConsent
{
    public const SOURCES = ['account_settings', 'notification_preferences', 'recorded_by_lawyer', 'client_portal', 'contact_form', 'whatsapp_reply', 'admin'];

    /**
     * Why a send is not allowed, or null when it is.
     *
     * @param  array<string, mixed>  $spec  from PlatformNotification::whatsAppTemplate()
     */
    public function blockReason(object $notifiable, array $spec, string $event): ?string
    {
        if ($notifiable instanceof User) {
            if (! $notifiable->hasWhatsAppConsent()) {
                return 'no_consent';
            }

            $optedIn = NotificationPreference::query()->where('user_id', $notifiable->id)->where('event', $event)
                ->where('channel', 'whatsapp')->value('enabled');

            return $optedIn ? null : 'event_not_enabled';
        }

        if (! empty($spec['client_id'])) {
            $client = Client::query()->find($spec['client_id']);

            return $client?->hasWhatsAppConsent() ? null : 'no_consent';
        }

        if (($spec['subject'] ?? null) instanceof ContactMessage) {
            return $spec['subject']->fresh()?->whatsapp_consent ? null : 'no_consent';
        }

        // Unknown recipient: fail closed.
        return 'no_consent';
    }

    public function grant(User|Client $person, string $source): void
    {
        $person->forceFill(['whatsapp_consent_at' => now(), 'whatsapp_consent_revoked_at' => null, 'whatsapp_consent_source' => $source])->save();
        $this->log($person, 'whatsapp_consent_given', $source);
    }

    public function withdraw(User|Client $person, string $source): void
    {
        if ($person->whatsapp_consent_at === null || $person->whatsapp_consent_revoked_at !== null) {
            return;
        }

        $person->forceFill(['whatsapp_consent_revoked_at' => now(), 'whatsapp_consent_source' => $source])->save();
        $this->log($person, 'whatsapp_consent_withdrawn', $source);
    }

    /**
     * Someone replied STOP (or similar) on WhatsApp: withdraw consent for every user and client record
     * using that number. Returns how many records changed.
     */
    public function optOutByNumber(string $number): int
    {
        $digits = preg_replace('/\D+/', '', $number);

        if (strlen((string) $digits) < 8) {
            return 0;
        }

        $tail = substr($digits, -10);
        $count = 0;

        User::query()->whereNotNull('whatsapp_consent_at')->whereNull('whatsapp_consent_revoked_at')->where('phone', 'like', '%'.$tail)
            ->each(function (User $user) use (&$count): void {
                $this->withdraw($user, 'whatsapp_reply');
                $count++;
            });

        Client::query()->whereNotNull('whatsapp_consent_at')->whereNull('whatsapp_consent_revoked_at')
            ->where(fn ($q) => $q->where('whatsapp', 'like', '%'.$tail)->orWhere('phone', 'like', '%'.$tail))
            ->each(function (Client $client) use (&$count): void {
                $this->withdraw($client, 'whatsapp_reply');
                $count++;
            });

        return $count;
    }

    /** Typical opt out words in English and Urdu. */
    public static function isOptOut(string $text): bool
    {
        return in_array(mb_strtolower(trim($text, " \t\n\r.!")), ['stop', 'unsubscribe', 'stop all', 'cancel', 'opt out', 'optout', 'بند', 'بند کریں', 'روکیں'], true);
    }

    private function log(User|Client $person, string $event, string $source): void
    {
        activity('consent')->performedOn($person)->causedBy(auth()->user())
            ->withProperties(['channel' => 'whatsapp', 'source' => $source])->log($event);
    }
}
