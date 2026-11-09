<?php

namespace App\Services\Calendar;

use App\Enums\CalendarEventStatus;
use App\Enums\CalendarVisibility;
use App\Models\CalendarEvent;
use App\Models\CalendarEventChange;
use App\Models\Client;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Writes for user-created calendar events. Every reschedule, cancellation and completion
 * is kept in calendar_event_changes and the audit log; the first scheduled time stays in
 * original_starts_at so the UI can show it struck through (docs/Modules/Calendar.md).
 */
class CalendarEventService
{
    public function __construct(private OrganizationAccess $access) {}

    /** @param  array<string, mixed>  $data  validated input */
    public function create(User $user, ?Organization $organization, array $data): CalendarEvent
    {
        $data = $this->guardLinks($user, $organization, $data);

        return DB::transaction(function () use ($user, $organization, $data): CalendarEvent {
            $event = CalendarEvent::create([
                ...$data,
                'organization_id' => $organization?->id,
                'user_id' => $user->id,
                'created_by' => $user->id,
                'status' => CalendarEventStatus::Scheduled,
                'original_starts_at' => $data['starts_at'],
                'original_ends_at' => $data['ends_at'] ?? null,
            ]);
            $this->log($event, $user, 'calendar_event_created');

            return $event;
        });
    }

    /** Edits details; the time can only change through reschedule() so history is never lost. */
    public function update(CalendarEvent $event, User $user, array $data): CalendarEvent
    {
        $this->ensureOpen($event);
        $organization = $event->organization_id ? Organization::find($event->organization_id) : null;
        $data = $this->guardLinks($user, $organization, $data);
        unset($data['starts_at'], $data['ends_at']);

        $event->update($data);
        $this->log($event, $user, 'calendar_event_updated');

        return $event;
    }

    public function reschedule(CalendarEvent $event, User $user, Carbon $startsAt, ?Carbon $endsAt, ?string $reason): CalendarEvent
    {
        $this->ensureOpen($event);

        if ($endsAt && $endsAt->lte($startsAt)) {
            throw ValidationException::withMessages(['ends_at' => __('The end must be after the start.')]);
        }
        if ($startsAt->equalTo($event->starts_at) && ($endsAt?->equalTo($event->ends_at) ?? $event->ends_at === null)) {
            throw ValidationException::withMessages(['starts_at' => __('Choose a different date or time.')]);
        }

        return DB::transaction(function () use ($event, $user, $startsAt, $endsAt, $reason): CalendarEvent {
            CalendarEventChange::create([
                'calendar_event_id' => $event->id, 'action' => 'rescheduled',
                'from_starts_at' => $event->starts_at, 'from_ends_at' => $event->ends_at,
                'to_starts_at' => $startsAt, 'to_ends_at' => $endsAt,
                'reason' => $reason, 'user_id' => $user->id,
            ]);

            $event->update([
                'original_starts_at' => $event->original_starts_at ?? $event->starts_at,
                'original_ends_at' => $event->original_ends_at ?? $event->ends_at,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => CalendarEventStatus::Rescheduled,
            ]);
            $this->log($event, $user, 'calendar_event_rescheduled', ['reason' => $reason]);

            return $event;
        });
    }

    public function cancel(CalendarEvent $event, User $user, string $reason): CalendarEvent
    {
        return $this->close($event, $user, CalendarEventStatus::Cancelled, 'cancelled', $reason);
    }

    public function complete(CalendarEvent $event, User $user): CalendarEvent
    {
        return $this->close($event, $user, CalendarEventStatus::Completed, 'completed', null);
    }

    private function close(CalendarEvent $event, User $user, CalendarEventStatus $status, string $action, ?string $reason): CalendarEvent
    {
        $this->ensureOpen($event);

        return DB::transaction(function () use ($event, $user, $status, $action, $reason): CalendarEvent {
            CalendarEventChange::create([
                'calendar_event_id' => $event->id, 'action' => $action,
                'from_starts_at' => $event->starts_at, 'from_ends_at' => $event->ends_at,
                'reason' => $reason, 'user_id' => $user->id,
            ]);
            $event->update(['status' => $status, 'cancellation_reason' => $status === CalendarEventStatus::Cancelled ? $reason : $event->cancellation_reason]);
            $this->log($event, $user, 'calendar_event_'.$action, ['reason' => $reason]);

            return $event;
        });
    }

    private function ensureOpen(CalendarEvent $event): void
    {
        if (! $event->status->isOpen()) {
            throw ValidationException::withMessages(['status' => __('This event is :status and can no longer be changed.', ['status' => mb_strtolower($event->status->label())])]);
        }
    }

    /**
     * Links (case, client, assignee) must belong to the user's organization and be visible
     * to them; people without an organization (clients, platform staff) keep events private.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function guardLinks(User $user, ?Organization $organization, array $data): array
    {
        if (! $organization) {
            return [...$data, 'legal_case_id' => null, 'client_id' => null, 'assigned_to' => null, 'visibility' => CalendarVisibility::Private->value];
        }

        if (! empty($data['legal_case_id'])) {
            $case = LegalCase::query()->forOrganization($organization)->find($data['legal_case_id']);
            if (! $case || ! $user->can('view', $case)) {
                throw ValidationException::withMessages(['legal_case_id' => __('Choose one of your cases.')]);
            }
        }

        if (! empty($data['client_id']) && ! Client::query()->forOrganization($organization)->whereKey($data['client_id'])->exists()) {
            throw ValidationException::withMessages(['client_id' => __('Choose one of your clients.')]);
        }

        if (! empty($data['assigned_to']) && ! $this->access->isMember(User::findOrFail($data['assigned_to']), $organization)) {
            throw ValidationException::withMessages(['assigned_to' => __('Choose a member of your team.')]);
        }

        if (($data['visibility'] ?? null) === CalendarVisibility::Client->value && empty($data['client_id'])) {
            throw ValidationException::withMessages(['client_id' => __('Choose the client who should see this event.')]);
        }

        return $data;
    }

    /** @param  array<string, mixed>  $properties */
    private function log(CalendarEvent $event, User $user, string $description, array $properties = []): void
    {
        activity('calendar')->causedBy($user)->performedOn($event)
            ->withProperties(['type' => $event->type->value, 'starts_at' => $event->starts_at->toIso8601String(), ...array_filter($properties)])
            ->log($description);
    }
}
