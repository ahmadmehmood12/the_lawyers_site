<?php

namespace App\Services\Hearings;

use App\Enums\HearingStatus;
use App\Events\HearingChanged;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Cases\Timeline;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Hearing workflow — the heart of the court diary (docs/Modules/Hearings.md).
 *
 * Invariants:
 *  - Hearings are never deleted or overwritten. Rescheduling creates a new row;
 *    the original is marked `rescheduled` and points to its replacement.
 *  - Recording an outcome may schedule the next hearing, linked via previous_hearing_id.
 *  - legal_cases.next_hearing_id/at always reflect the earliest upcoming scheduled hearing.
 *  - Overlaps produce warnings, not errors (lawyers legitimately juggle courts).
 */
class HearingService
{
    public function __construct(private Timeline $timeline, private OrganizationAccess $access) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function schedule(LegalCase $case, array $data, User $actor, ?Hearing $previous = null): Hearing
    {
        $this->assertAssignableLawyer($case, $data['assigned_lawyer_id'] ?? null);

        return DB::transaction(function () use ($case, $data, $actor, $previous): Hearing {
            $hearing = $case->hearings()->create([
                ...Arr::only($data, ['court_id', 'judge_id', 'judge_name', 'courtroom', 'hearing_date', 'hearing_time', 'hearing_type', 'purpose', 'assigned_lawyer_id', 'preparation_notes', 'visible_to_client']),
                'court_id' => $data['court_id'] ?? $case->court_id,
                'judge_id' => $data['judge_id'] ?? $case->judge_id,
                'judge_name' => $data['judge_name'] ?? $case->judge_name,
                'courtroom' => $data['courtroom'] ?? $case->courtroom,
                'visible_to_client' => (bool) ($data['visible_to_client'] ?? true),
                'hearing_type' => $data['hearing_type'] ?? 'regular',
                'organization_id' => $case->organization_id,
                'status' => HearingStatus::Scheduled,
                'previous_hearing_id' => $previous?->id,
                'created_by' => $actor->id,
            ]);

            $this->refreshNextHearing($case);
            $this->timeline->record(
                $case,
                'hearing_scheduled',
                __('Hearing scheduled for :date', ['date' => $hearing->hearing_date->translatedFormat('d M Y')]),
                $hearing->purpose,
                $hearing,
                $hearing->visible_to_client,
            );

            HearingChanged::dispatch($hearing, 'scheduled');

            return $hearing;
        });
    }

    public function reschedule(Hearing $hearing, string $date, ?string $time, string $reason, User $actor): Hearing
    {
        if ($hearing->status !== HearingStatus::Scheduled) {
            throw ValidationException::withMessages(['hearing_date' => __('Only scheduled hearings can be rescheduled.')]);
        }

        return DB::transaction(function () use ($hearing, $date, $time, $reason, $actor): Hearing {
            $replacement = $hearing->replicate(['status', 'rescheduled_to_id', 'reschedule_reason', 'created_by']);
            $replacement->fill([
                'hearing_date' => $date,
                'hearing_time' => $time,
                'status' => HearingStatus::Scheduled,
                'previous_hearing_id' => $hearing->previous_hearing_id,
                'created_by' => $actor->id,
            ])->save();

            $hearing->update([
                'status' => HearingStatus::Rescheduled,
                'rescheduled_to_id' => $replacement->id,
                'reschedule_reason' => $reason,
            ]);

            $this->refreshNextHearing($hearing->legalCase);
            $this->timeline->record(
                $hearing->legalCase,
                'hearing_rescheduled',
                __('Hearing moved from :from to :to', ['from' => $hearing->hearing_date->translatedFormat('d M Y'), 'to' => $replacement->hearing_date->translatedFormat('d M Y')]),
                $reason,
                $replacement,
                $replacement->visible_to_client,
            );

            HearingChanged::dispatch($replacement, 'rescheduled', $hearing);

            return $replacement;
        });
    }

    public function cancel(Hearing $hearing, string $reason): Hearing
    {
        if ($hearing->status !== HearingStatus::Scheduled) {
            throw ValidationException::withMessages(['reason' => __('Only scheduled hearings can be cancelled.')]);
        }

        return DB::transaction(function () use ($hearing, $reason): Hearing {
            $hearing->update(['status' => HearingStatus::Cancelled, 'cancellation_reason' => $reason]);
            $this->refreshNextHearing($hearing->legalCase);
            $this->timeline->record($hearing->legalCase, 'hearing_cancelled', __('Hearing of :date cancelled', ['date' => $hearing->hearing_date->translatedFormat('d M Y')]), $reason, $hearing, $hearing->visible_to_client);

            HearingChanged::dispatch($hearing, 'cancelled');

            return $hearing;
        });
    }

    /**
     * Record what happened. Optionally schedules the next date in the same transaction.
     *
     * @param  array<string, mixed>  $data
     * @return array{hearing: Hearing, next: Hearing|null}
     */
    public function recordOutcome(Hearing $hearing, array $data, User $actor): array
    {
        if (in_array($hearing->status, [HearingStatus::Cancelled, HearingStatus::Rescheduled], true)) {
            throw ValidationException::withMessages(['held_on' => __('Outcome cannot be recorded for a cancelled or rescheduled hearing.')]);
        }

        return DB::transaction(function () use ($hearing, $data, $actor): array {
            $isCorrection = $hearing->hasOutcome();
            $adjourned = filled($data['adjournment_reason'] ?? null);

            $hearing->fill([
                ...Arr::only($data, ['held_on', 'lawyer_attendance', 'client_attendance', 'opposing_counsel_attendance', 'proceedings', 'arguments', 'evidence', 'documents_submitted', 'order_passed', 'adjournment_reason', 'next_hearing_date', 'next_hearing_purpose', 'internal_notes', 'client_note']),
                'held_on' => $data['held_on'] ?? $hearing->hearing_date,
                'status' => $adjourned ? HearingStatus::Adjourned : HearingStatus::Held,
                'outcome_recorded_by' => $actor->id,
                'outcome_recorded_at' => now(),
            ])->save();

            $case = $hearing->legalCase;
            $this->timeline->record(
                $case,
                $isCorrection ? 'hearing_outcome_corrected' : 'hearing_held',
                $adjourned
                    ? __('Hearing adjourned: :reason', ['reason' => $hearing->adjournment_reason])
                    : __('Proceedings recorded for :date', ['date' => $hearing->held_on->translatedFormat('d M Y')]),
                $hearing->client_note ?: null,
                $hearing,
                $hearing->visible_to_client,
            );

            $next = null;
            if (! empty($data['schedule_next']) && ! empty($data['next_hearing_date']) && ! $this->nextHearingExists($hearing)) {
                $next = $this->schedule($case, [
                    'hearing_date' => $data['next_hearing_date'],
                    'hearing_time' => $data['next_hearing_time'] ?? $hearing->hearing_time,
                    'purpose' => $data['next_hearing_purpose'] ?? null,
                    'hearing_type' => $data['next_hearing_type'] ?? $hearing->hearing_type?->value,
                    'assigned_lawyer_id' => $hearing->assigned_lawyer_id,
                    'court_id' => $hearing->court_id,
                    'judge_id' => $hearing->judge_id,
                    'judge_name' => $hearing->judge_name,
                    'courtroom' => $hearing->courtroom,
                    'visible_to_client' => $hearing->visible_to_client,
                ], $actor, $hearing);
            }

            $this->refreshNextHearing($case);
            HearingChanged::dispatch($hearing, 'outcome');

            return ['hearing' => $hearing, 'next' => $next];
        });
    }

    /**
     * Other hearings for the same lawyer within ±90 minutes (or any untimed hearing that day).
     *
     * @return Collection<int, Hearing>
     */
    public function conflicts(int $organizationId, ?int $lawyerId, string $date, ?string $time, ?int $ignoreId = null): Collection
    {
        if (! $lawyerId) {
            return collect();
        }

        $hearings = Hearing::query()
            ->with(['legalCase:id,title,reference', 'court:id,name'])
            ->where('assigned_lawyer_id', $lawyerId)
            ->whereDate('hearing_date', $date)
            ->where('status', HearingStatus::Scheduled->value)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->get();

        if (! $time) {
            return $hearings;
        }

        $target = Carbon::parse($date.' '.$time);

        return $hearings->filter(fn (Hearing $h) => ! $h->hearing_time || abs($h->startsAt()->diffInMinutes($target, false)) < 90)->values();
    }

    public function refreshNextHearing(LegalCase $case): void
    {
        $next = $case->hearings()
            ->where('status', HearingStatus::Scheduled->value)
            ->whereDate('hearing_date', '>=', today())
            ->orderBy('hearing_date')
            ->orderByRaw('hearing_time IS NULL, hearing_time')
            ->first();

        $case->forceFill([
            'next_hearing_id' => $next?->id,
            'next_hearing_at' => $next?->startsAt(),
        ])->saveQuietly();
    }

    private function nextHearingExists(Hearing $hearing): bool
    {
        return Hearing::query()->where('previous_hearing_id', $hearing->id)->whereIn('status', [HearingStatus::Scheduled->value, HearingStatus::Held->value, HearingStatus::Adjourned->value])->exists();
    }

    private function assertAssignableLawyer(LegalCase $case, mixed $lawyerId): void
    {
        if ($lawyerId && ! $this->access->isMember(User::findOrFail((int) $lawyerId), $case->organization_id)) {
            throw ValidationException::withMessages(['assigned_lawyer_id' => __('Assigned lawyer must be a member of this organization.')]);
        }
    }
}
