<?php

namespace App\Services\Calendar;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\CalendarEvent;
use App\Models\Hearing;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Full scheduling history of one calendar item, read from where it already lives:
 * hearings (rescheduled_to_id chain), appointments (rescheduled_from_id chain) and
 * calendar events (calendar_event_changes). Callers authorize first.
 *
 * Each step: {when, status, label, reason, by, at, current}.
 */
class CalendarHistory
{
    /** @return list<array<string, mixed>> */
    public function hearing(Hearing $hearing): array
    {
        $chain = [$hearing];
        $cursor = $hearing;
        for ($i = 0; $i < 50 && ($previous = Hearing::query()->where('rescheduled_to_id', $cursor->id)->first()); $i++) {
            array_unshift($chain, $previous);
            $cursor = $previous;
        }
        $cursor = $hearing;
        for ($i = 0; $i < 50 && $cursor->rescheduled_to_id && ($next = Hearing::find($cursor->rescheduled_to_id)); $i++) {
            $chain[] = $next;
            $cursor = $next;
        }

        $names = User::query()->whereIn('id', collect($chain)->pluck('created_by')->filter())->pluck('name', 'id');

        return collect($chain)->map(fn (Hearing $h, int $i) => [
            'when' => $this->at($h->hearing_date, $h->hearing_time),
            'all_day' => $h->hearing_time === null,
            'status' => $h->status->value,
            'label' => $h->status->label(),
            'reason' => $h->reschedule_reason ?? $h->cancellation_reason,
            'action' => $i === 0 ? __('First scheduled') : __('Rescheduled to this date'),
            'by' => $names[$h->created_by] ?? null,
            'at' => $h->created_at->toIso8601String(),
            'current' => $h->id === $hearing->id,
        ])->all();
    }

    /** @return list<array<string, mixed>> */
    public function appointment(Appointment $appointment): array
    {
        $chain = [$appointment];
        $cursor = $appointment;
        for ($i = 0; $i < 50 && $cursor->rescheduled_from_id && ($previous = Appointment::find($cursor->rescheduled_from_id)); $i++) {
            array_unshift($chain, $previous);
            $cursor = $previous;
        }
        $cursor = $appointment;
        for ($i = 0; $i < 50 && ($next = Appointment::query()->where('rescheduled_from_id', $cursor->id)->first()); $i++) {
            $chain[] = $next;
            $cursor = $next;
        }

        return collect($chain)->map(fn (Appointment $a, int $i) => [
            'when' => $a->starts_at->format('Y-m-d\TH:i'),
            'all_day' => false,
            'status' => $a->status->value,
            'label' => $a->status === AppointmentStatus::Cancelled && $i < count($chain) - 1 ? __('Moved') : $a->status->label(),
            'reason' => $a->cancellation_reason,
            'action' => $i === 0 ? __('First booked') : __('Rescheduled to this time'),
            'by' => null,
            'at' => $a->created_at->toIso8601String(),
            'current' => $a->id === $appointment->id,
        ])->all();
    }

    /** @return list<array<string, mixed>> */
    public function event(CalendarEvent $event): array
    {
        $event->loadMissing(['changes.user:id,name', 'owner:id,name']);
        $first = $event->original_starts_at ?? $event->starts_at;

        $steps = [[
            'when' => $first->format('Y-m-d\TH:i'),
            'all_day' => $event->all_day,
            'status' => 'scheduled',
            'label' => __('Scheduled'),
            'reason' => null,
            'action' => __('Created'),
            'by' => $event->owner?->name,
            'at' => $event->created_at->toIso8601String(),
            'current' => $event->changes->isEmpty(),
        ]];

        foreach ($event->changes as $i => $change) {
            $steps[] = [
                'when' => ($change->to_starts_at ?? $change->from_starts_at)?->format('Y-m-d\TH:i'),
                'all_day' => $event->all_day,
                'status' => $change->action,
                'label' => match ($change->action) {
                    'rescheduled' => __('Rescheduled'),
                    'cancelled' => __('Cancelled'),
                    'completed' => __('Completed'),
                    default => ucfirst($change->action),
                },
                'reason' => $change->reason,
                'action' => $change->action === 'rescheduled' ? __('Moved from :from', ['from' => $change->from_starts_at?->translatedFormat($event->all_day ? 'd M Y' : 'd M Y, h:i a')]) : null,
                'by' => $change->user?->name,
                'at' => $change->created_at->toIso8601String(),
                'current' => $i === $event->changes->count() - 1,
            ];
        }

        return $steps;
    }

    private function at(Carbon $date, ?string $time): string
    {
        return ($time ? $date->copy()->setTimeFromTimeString($time) : $date->copy()->startOfDay())->format('Y-m-d\TH:i');
    }
}
