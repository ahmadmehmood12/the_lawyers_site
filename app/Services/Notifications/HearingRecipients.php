<?php

namespace App\Services\Notifications;

use App\Models\Client;
use App\Models\Hearing;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

/**
 * Delivers a hearing notification to the right people:
 *  - the assigned lawyer (or case lead) as a platform user
 *  - linked clients, only when the hearing is visible to clients:
 *      portal users via their account; others by email (if recorded) and by
 *      WhatsApp only with recorded consent
 */
class HearingRecipients
{
    /**
     * @param  callable(bool $forClient, ?int $clientId): Notification  $make
     */
    public function notify(Hearing $hearing, callable $make, bool $lawyer = true, bool $clients = true, ?int $exceptUserId = null): void
    {
        $hearing->loadMissing(['legalCase.clients', 'legalCase.lawyers', 'assignedLawyer']);

        if ($lawyer) {
            $recipient = $hearing->assignedLawyer ?? $hearing->legalCase->lawyers->firstWhere('pivot.role', 'lead');
            if ($recipient instanceof User && $recipient->id !== $exceptUserId && ! $recipient->isSuspended()) {
                $recipient->notify($make(false, null));
            }
        }

        if (! $clients || ! $hearing->visible_to_client || ! $hearing->legalCase->share_with_client) {
            return;
        }

        foreach ($hearing->legalCase->clients as $client) {
            /** @var Client $client */
            if ($client->user_id && ($user = User::find($client->user_id)) && ! $user->isSuspended()) {
                $user->notify($make(true, $client->id));
            } else {
                // No portal account: email when the chambers recorded one, WhatsApp only with consent.
                $route = null;
                if ($client->email) {
                    $route = NotificationFacade::route('mail', [$client->email => $client->name]);
                }
                if ($client->hasWhatsAppConsent() && $client->whatsAppNumber()) {
                    $route = ($route ?? NotificationFacade::route('whatsapp', $client->whatsAppNumber()))->route('whatsapp', $client->whatsAppNumber());
                }
                $route?->notify($make(true, $client->id)->locale($client->preferred_locale ?: 'en'));
            }
        }
    }
}
