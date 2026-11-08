<?php

namespace App\Services\Cases;

use App\Models\CaseEvent;
use App\Models\LegalCase;
use Illuminate\Database\Eloquent\Model;

/**
 * Chronological case timeline (case_events). Entries are append-only.
 * `visible_to_client` controls what the client portal shows.
 */
class Timeline
{
    public function record(LegalCase $case, string $type, string $title, ?string $description = null, ?Model $subject = null, bool $visibleToClient = false, $occurredAt = null): CaseEvent
    {
        return CaseEvent::create([
            'legal_case_id' => $case->id,
            'actor_id' => auth()->id(),
            'type' => $type,
            'title' => $title,
            'description' => $description,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'visible_to_client' => $visibleToClient,
            'occurred_at' => $occurredAt ?? now(),
        ]);
    }
}
