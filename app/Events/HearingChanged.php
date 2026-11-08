<?php

namespace App\Events;

use App\Models\Hearing;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired after a hearing is scheduled, rescheduled, cancelled or its outcome recorded.
 * Listener: App\Listeners\NotifyHearingParticipants (queued).
 *
 * @param  'scheduled'|'rescheduled'|'cancelled'|'outcome'  $change
 */
class HearingChanged
{
    use Dispatchable, SerializesModels;

    public function __construct(public Hearing $hearing, public string $change, public ?Hearing $previous = null) {}
}
