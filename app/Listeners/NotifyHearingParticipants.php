<?php

namespace App\Listeners;

use App\Events\HearingChanged;
use App\Notifications\HearingUpdated;
use App\Services\Notifications\HearingRecipients;

/**
 * Informs the assigned lawyer and (if visible) clients when hearings change.
 * Runs after commit; notifications themselves are queued.
 */
class NotifyHearingParticipants
{
    public bool $afterCommit = true;

    public function __construct(private HearingRecipients $recipients) {}

    public function handle(HearingChanged $event): void
    {
        if ($event->change === 'outcome' && ! $event->hearing->client_note) {
            return;
        }

        $this->recipients->notify(
            $event->hearing,
            fn (bool $forClient, ?int $clientId) => new HearingUpdated($event->hearing, $event->change, $forClient, $clientId),
            lawyer: $event->change !== 'outcome',
            clients: true,
            exceptUserId: auth()->id(),
        );
    }
}
