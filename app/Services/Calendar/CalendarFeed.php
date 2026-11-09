<?php

namespace App\Services\Calendar;

use App\Enums\AppointmentStatus;
use App\Enums\CalendarEventStatus;
use App\Enums\CalendarVisibility;
use App\Enums\HearingStatus;
use App\Enums\Recurrence;
use App\Enums\TaskStatus;
use App\Models\Appointment;
use App\Models\CalendarEvent;
use App\Models\Client;
use App\Models\DiaryEntry;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * One calendar for every account type (docs/Modules/Calendar.md).
 *
 * Nothing is copied: hearings, appointments, tasks (due dates), diary notes and
 * calendar_events are read from their own tables with the same visibility rules
 * their modules use, then normalised to one shape. Rescheduled items stay
 * identifiable: the replacement carries `original_start` (shown struck through)
 * and the old slot is returned as a faded `ghost` pointing to the new date.
 */
class CalendarFeed
{
    /** Cap per source so a wide range cannot load unbounded rows. */
    private const LIMIT = 600;

    public function __construct(private OrganizationAccess $access, private CurrentOrganization $current) {}

    /** The organization a professional is working in (null for clients and platform staff). */
    public function organizationFor(User $user): ?Organization
    {
        return $user->isProfessional() ? $this->current->for($user) : null;
    }

    /**
     * @param  array{types?: list<string>, case_id?: int|null, lawyer_id?: int|null, status?: string|null}  $filters
     * @return list<array<string, mixed>>
     */
    public function events(User $user, Carbon $from, Carbon $to, array $filters = []): array
    {
        $organization = $this->organizationFor($user);
        $types = $filters['types'] ?? [];
        $wants = fn (string ...$candidates) => $types === [] || array_intersect($candidates, $types) !== [];

        $items = collect();

        if ($wants('hearing')) {
            $items = $items->concat($this->hearings($user, $organization, $from, $to, $filters));
        }
        if ($wants('appointment', 'consultation')) {
            $items = $items->concat($this->appointments($user, $organization, $from, $to, $filters));
        }
        if ($organization && $wants('task')) {
            $items = $items->concat($this->tasks($user, $organization, $from, $to, $filters));
        }
        if ($organization && $wants('note')) {
            $items = $items->concat($this->notes($user, $organization, $from, $to, $filters));
        }
        $items = $items->concat($this->calendarEvents($user, $organization, $from, $to, $filters));

        return $items
            ->when($types !== [], fn (Collection $c) => $c->filter(fn ($i) => in_array($i['type'], $types, true)))
            ->when($filters['status'] ?? null, fn (Collection $c, string $status) => $c->filter(fn ($i) => $i['status'] === $status))
            ->sortBy([['start', 'asc'], ['title', 'asc']])
            ->values()
            ->all();
    }

    /**
     * Open items in the next two weeks, soonest first (sidebar "Coming up").
     *
     * @return list<array<string, mixed>>
     */
    public function upcoming(User $user, int $limit = 8): array
    {
        $now = now();

        return collect($this->events($user, $now->copy()->startOfDay(), $now->copy()->addDays(14)->endOfDay()))
            ->filter(fn ($i) => ! $i['ghost'] && in_array($i['status'], ['scheduled', 'rescheduled'], true) && $i['end'] >= $now->format('Y-m-d\TH:i'))
            ->take($limit)
            ->values()
            ->all();
    }

    /** @return Collection<int, array<string, mixed>> */
    private function hearings(User $user, ?Organization $organization, Carbon $from, Carbon $to, array $filters): Collection
    {
        $relations = ['legalCase:id,title,reference,case_number', 'legalCase.clients:id,name', 'court:id,name', 'assignedLawyer:id,name', 'rescheduledFrom:id,rescheduled_to_id,hearing_date,hearing_time,reschedule_reason', 'rescheduledTo:id,hearing_date,hearing_time'];

        if ($user->isClient()) {
            $query = Hearing::query()->where('visible_to_client', true)
                ->whereIn('legal_case_id', LegalCase::query()->sharedWithClientUser($user)->select('legal_cases.id'));
        } elseif ($organization && $this->access->allows($user, $organization, 'hearings.view')) {
            $query = Hearing::query()->visibleTo($user, $organization)
                ->when($this->seesAll($user, $organization) && ($filters['lawyer_id'] ?? null), fn ($q) => $q->where('assigned_lawyer_id', $filters['lawyer_id']));
        } else {
            return collect();
        }

        return $query->with($relations)
            ->whereBetween('hearing_date', [$from->toDateString(), $to->toDateString()])
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('legal_case_id', $id))
            ->orderBy('hearing_date')->limit(self::LIMIT)->get()
            ->map(function (Hearing $h) use ($user) {
                $start = $this->at($h->hearing_date, $h->hearing_time);
                $moved = $h->status === HearingStatus::Rescheduled;
                $from = $h->rescheduledFrom;

                return $this->item([
                    'key' => 'hearing-'.$h->id,
                    'source' => 'hearing',
                    'id' => $h->id,
                    'type' => 'hearing',
                    'title' => $h->legalCase->title,
                    'subtitle' => $h->purpose ?: $h->hearing_type?->label(),
                    'start' => $start,
                    'end' => $h->hearing_time ? $start->copy()->addHour() : $start->copy()->endOfDay(),
                    'all_day' => $h->hearing_time === null,
                    'location' => trim(($h->court?->name ?? '').($h->courtroom ? ', '.__('Room').' '.$h->courtroom : ''), ', ') ?: null,
                    'case' => ['id' => $h->legalCase->id, 'title' => $h->legalCase->title, 'reference' => $h->legalCase->case_number ?: $h->legalCase->reference],
                    'client' => $h->legalCase->clients->pluck('name')->join(', ') ?: null,
                    'lawyer' => $user->isClient() ? null : $h->assignedLawyer?->name,
                    'status' => match (true) {
                        $moved => 'rescheduled',
                        $h->status === HearingStatus::Cancelled => 'cancelled',
                        in_array($h->status, [HearingStatus::Held, HearingStatus::Adjourned], true) => 'completed',
                        $from !== null => 'rescheduled',
                        default => 'scheduled',
                    },
                    'status_label' => $h->status->label(),
                    'ghost' => $moved,
                    'moved_to' => $moved && $h->rescheduledTo ? $this->at($h->rescheduledTo->hearing_date, $h->rescheduledTo->hearing_time)->format('Y-m-d\TH:i') : null,
                    'original_start' => ! $moved && $from ? $this->at($from->hearing_date, $from->hearing_time)->format('Y-m-d\TH:i') : null,
                    'reason' => $moved ? $h->reschedule_reason : ($from?->reschedule_reason ?? ($h->status === HearingStatus::Cancelled ? $h->cancellation_reason : null)),
                    'url' => $user->isClient() ? route('portal.cases.show', $h->legal_case_id) : route('cases.show', ['case' => $h->legal_case_id, 'tab' => 'hearings']),
                    'manage_url' => $user->isClient() ? null : route('diary.index', ['view' => 'day', 'date' => $h->hearing_date->toDateString()]),
                    'has_history' => $moved || $from !== null,
                    'hearing' => $user->isClient() ? null : ['id' => $h->id, 'hearing_time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : null, 'assigned_lawyer_id' => $h->assigned_lawyer_id],
                    'can' => ['edit' => false, 'reschedule' => ! $user->isClient() && $h->status === HearingStatus::Scheduled && $user->can('update', $h), 'cancel' => ! $user->isClient() && $h->status === HearingStatus::Scheduled && $user->can('update', $h)],
                ]);
            });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function appointments(User $user, ?Organization $organization, Carbon $from, Carbon $to, array $filters): Collection
    {
        if ($user->isClient()) {
            $query = Appointment::query()->where(fn ($q) => $q->where('requested_by', $user->id)
                ->orWhereIn('client_id', Client::query()->where('user_id', $user->id)->select('id')));
        } elseif ($organization) {
            $manageAll = $this->access->allows($user, $organization, 'appointments.manage');
            if (! $manageAll && ! $user->isLawyer()) {
                return collect();
            }
            $query = Appointment::query()->forOrganization($organization)
                ->when(! $manageAll, fn ($q) => $q->where('lawyer_id', $user->id))
                ->when($manageAll && ($filters['lawyer_id'] ?? null), fn ($q) => $q->where('lawyer_id', $filters['lawyer_id']));
        } else {
            return collect();
        }

        return $query->with(['lawyer:id,name', 'client:id,name', 'legalCase:id,title,reference,case_number', 'rescheduledFrom:id,starts_at', 'rescheduledTo:id,rescheduled_from_id,starts_at'])
            ->whereBetween('starts_at', [$from, $to])
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('legal_case_id', $id))
            ->orderBy('starts_at')->limit(self::LIMIT)->get()
            ->map(function (Appointment $a) use ($user) {
                $moved = $a->status === AppointmentStatus::Cancelled && $a->rescheduledTo !== null;

                return $this->item([
                    'key' => 'appointment-'.$a->id,
                    'source' => 'appointment',
                    'id' => $a->id,
                    'type' => $a->kind === 'consultation' ? 'consultation' : 'appointment',
                    'title' => $user->isClient() ? __('Consultation with :name', ['name' => $a->lawyer->name]) : __('Consultation: :name', ['name' => $a->client?->name ?? $a->contact_name]),
                    'subtitle' => $a->mode->label(),
                    'start' => $a->starts_at,
                    'end' => $a->ends_at,
                    'all_day' => false,
                    'location' => $a->meeting_link ? __('Online meeting') : null,
                    'case' => $a->legalCase ? ['id' => $a->legalCase->id, 'title' => $a->legalCase->title, 'reference' => $a->legalCase->case_number ?: $a->legalCase->reference] : null,
                    'client' => $user->isClient() ? null : ($a->client?->name ?? $a->contact_name),
                    'lawyer' => $a->lawyer->name,
                    'status' => match (true) {
                        $moved => 'rescheduled',
                        in_array($a->status, [AppointmentStatus::Cancelled, AppointmentStatus::Declined, AppointmentStatus::NoShow], true) => 'cancelled',
                        $a->status === AppointmentStatus::Completed => 'completed',
                        $a->rescheduledFrom !== null => 'rescheduled',
                        default => 'scheduled',
                    },
                    'status_label' => $a->status->label(),
                    'ghost' => $moved,
                    'moved_to' => $moved ? $a->rescheduledTo->starts_at->format('Y-m-d\TH:i') : null,
                    'original_start' => ! $moved && $a->rescheduledFrom ? $a->rescheduledFrom->starts_at->format('Y-m-d\TH:i') : null,
                    'reason' => $a->cancellation_reason,
                    'url' => $user->isClient() ? route('portal.appointments.index') : route('appointments.index'),
                    'manage_url' => $user->isClient() ? route('portal.appointments.index') : route('appointments.index'),
                    'has_history' => $moved || $a->rescheduledFrom !== null,
                    'can' => ['edit' => false, 'reschedule' => false, 'cancel' => false],
                ]);
            });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function tasks(User $user, Organization $organization, Carbon $from, Carbon $to, array $filters): Collection
    {
        return Task::query()->forOrganization($organization)
            ->where(fn ($q) => $q->where('assigned_to', $user->id)->orWhere(fn ($w) => $w->whereNull('assigned_to')->where('created_by', $user->id)))
            ->whereNotNull('due_date')->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
            ->where('status', '!=', TaskStatus::Cancelled->value)
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('legal_case_id', $id))
            ->with('legalCase:id,title,reference,case_number')->limit(self::LIMIT)->get()
            ->map(fn (Task $t) => $this->item([
                'key' => 'task-'.$t->id,
                'source' => 'task',
                'id' => $t->id,
                'type' => 'task',
                'title' => $t->title,
                'subtitle' => $t->priority?->label(),
                'start' => $t->due_date->copy()->startOfDay(),
                'end' => $t->due_date->copy()->endOfDay(),
                'all_day' => true,
                'case' => $t->legalCase ? ['id' => $t->legalCase->id, 'title' => $t->legalCase->title, 'reference' => $t->legalCase->case_number ?: $t->legalCase->reference] : null,
                'status' => $t->status === TaskStatus::Done ? 'completed' : 'scheduled',
                'status_label' => $t->status->label(),
                'url' => route('tasks.index'),
                'manage_url' => route('tasks.index'),
            ]));
    }

    /** @return Collection<int, array<string, mixed>> */
    private function notes(User $user, Organization $organization, Carbon $from, Carbon $to, array $filters): Collection
    {
        return DiaryEntry::query()->forOrganization($organization)->where('user_id', $user->id)
            ->whereBetween('entry_date', [$from->toDateString(), $to->toDateString()])
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('legal_case_id', $id))
            ->with('legalCase:id,title,reference,case_number')->limit(self::LIMIT)->get()
            ->map(function (DiaryEntry $e) {
                $start = $this->at($e->entry_date, $e->entry_time);

                return $this->item([
                    'key' => 'note-'.$e->id,
                    'source' => 'note',
                    'id' => $e->id,
                    'type' => 'note',
                    'title' => $e->title,
                    'subtitle' => $e->notes ? mb_strimwidth($e->notes, 0, 120, '…') : null,
                    'start' => $start,
                    'end' => $e->entry_time ? $start->copy()->addMinutes(30) : $start->copy()->endOfDay(),
                    'all_day' => $e->entry_time === null,
                    'case' => $e->legalCase ? ['id' => $e->legalCase->id, 'title' => $e->legalCase->title, 'reference' => $e->legalCase->case_number ?: $e->legalCase->reference] : null,
                    'status' => 'scheduled',
                    'status_label' => __('Diary note'),
                    'url' => route('diary.index', ['view' => 'day', 'date' => $e->entry_date->toDateString()]),
                    'manage_url' => route('diary.index', ['view' => 'day', 'date' => $e->entry_date->toDateString()]),
                ]);
            });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function calendarEvents(User $user, ?Organization $organization, Carbon $from, Carbon $to, array $filters): Collection
    {
        $clientIds = $user->isClient() ? Client::query()->where('user_id', $user->id)->pluck('id') : collect();

        $events = CalendarEvent::query()
            ->with(['owner:id,name', 'assignee:id,name', 'legalCase:id,title,reference,case_number', 'client:id,name'])
            ->where(function (Builder $q) use ($user, $organization, $clientIds): void {
                $q->where('user_id', $user->id)->orWhere('assigned_to', $user->id);

                if ($organization) {
                    $q->orWhere(fn (Builder $w) => $w->where('organization_id', $organization->id)
                        ->whereIn('visibility', [CalendarVisibility::Team->value, CalendarVisibility::Client->value])
                        ->where(fn (Builder $c) => $c->whereNull('legal_case_id')
                            ->orWhereIn('legal_case_id', LegalCase::query()->visibleTo($user, $organization)->select('legal_cases.id'))));
                }

                if ($clientIds->isNotEmpty()) {
                    $q->orWhere(fn (Builder $w) => $w->where('visibility', CalendarVisibility::Client->value)->whereIn('client_id', $clientIds));
                }
            })
            ->where('starts_at', '<=', $to)
            ->where(fn (Builder $q) => $q->where(fn ($w) => $w->where('recurrence', Recurrence::None->value)->where('starts_at', '>=', $from->copy()->subDay()))
                ->orWhere(fn ($w) => $w->where('recurrence', '!=', Recurrence::None->value)->where(fn ($u) => $u->whereNull('recurrence_until')->orWhere('recurrence_until', '>=', $from->toDateString()))))
            ->when($filters['case_id'] ?? null, fn ($q, $id) => $q->where('legal_case_id', $id))
            ->when(! $user->isClient() && ($filters['lawyer_id'] ?? null), fn ($q) => $q->where(fn ($w) => $w->where('assigned_to', $filters['lawyer_id'])->orWhere('user_id', $filters['lawyer_id'])))
            ->limit(self::LIMIT)->get();

        return $events->flatMap(fn (CalendarEvent $e) => collect($this->occurrences($e, $from, $to))->map(function (Carbon $start) use ($e, $user) {
            $duration = $e->ends_at ? $e->starts_at->diffInMinutes($e->ends_at) : 60;
            $canChange = $user->can('update', $e);
            $open = $e->status->isOpen();

            return $this->item([
                'key' => 'event-'.$e->id.'-'.$start->format('YmdHi'),
                'source' => 'event',
                'id' => $e->id,
                'type' => $e->type->value,
                'title' => $e->title,
                'subtitle' => $e->description ? mb_strimwidth($e->description, 0, 120, '…') : null,
                'description' => $e->description,
                'start' => $start,
                'end' => $e->all_day ? $start->copy()->endOfDay() : $start->copy()->addMinutes($duration),
                'all_day' => $e->all_day,
                'location' => $e->location,
                'case' => $e->legalCase ? ['id' => $e->legalCase->id, 'title' => $e->legalCase->title, 'reference' => $e->legalCase->case_number ?: $e->legalCase->reference] : null,
                'client' => $user->isClient() ? null : $e->client?->name,
                'lawyer' => $e->assignee?->name ?? $e->owner?->name,
                'status' => $e->status->value,
                'status_label' => $e->status->label(),
                'original_start' => $e->wasRescheduled() && $e->recurrence === Recurrence::None ? $e->original_starts_at->format('Y-m-d\TH:i') : null,
                'reason' => $e->cancellation_reason,
                'has_history' => $e->status !== CalendarEventStatus::Scheduled,
                'recurrence' => $e->recurrence->value,
                'recurrence_label' => $e->recurrence === Recurrence::None ? null : $e->recurrence->label(),
                'visibility' => $e->visibility->value,
                'owner' => $e->owner?->name,
                'editable' => [
                    'type' => $e->type->value, 'title' => $e->title, 'description' => $e->description, 'location' => $e->location,
                    'starts_at' => $e->starts_at->format('Y-m-d\TH:i'), 'ends_at' => $e->ends_at?->format('Y-m-d\TH:i'), 'all_day' => $e->all_day,
                    'visibility' => $e->visibility->value, 'legal_case_id' => $e->legal_case_id, 'client_id' => $e->client_id, 'assigned_to' => $e->assigned_to,
                    'recurrence' => $e->recurrence->value, 'recurrence_interval' => $e->recurrence_interval, 'recurrence_until' => $e->recurrence_until?->toDateString(),
                ],
                'can' => ['edit' => $canChange && $open, 'reschedule' => $canChange && $open, 'cancel' => $canChange && $open, 'complete' => $canChange && $open],
            ]);
        }));
    }

    /**
     * Start times of an event inside [from, to]; a series repeats from its first start.
     *
     * @return list<Carbon>
     */
    public function occurrences(CalendarEvent $event, Carbon $from, Carbon $to): array
    {
        $length = $event->ends_at ? $event->starts_at->diffInMinutes($event->ends_at) : 0;

        if ($event->recurrence === Recurrence::None) {
            return $event->starts_at->copy()->addMinutes($length)->gte($from) && $event->starts_at->lte($to) ? [$event->starts_at->copy()] : [];
        }

        $step = max(1, (int) $event->recurrence_interval);
        $until = $event->recurrence_until ? $event->recurrence_until->copy()->endOfDay()->min($to) : $to;
        $cursor = $event->starts_at->copy();
        $out = [];

        for ($i = 0; $i < 1000 && $cursor->lte($until); $i++) {
            if ($cursor->copy()->addMinutes($length)->gte($from)) {
                $out[] = $cursor->copy();
            }
            $cursor = match ($event->recurrence) {
                Recurrence::Daily => $cursor->addDays($step),
                Recurrence::Weekly => $cursor->addWeeks($step),
                default => $cursor->addMonthsNoOverflow($step),
            };
        }

        return $out;
    }

    private function seesAll(User $user, Organization $organization): bool
    {
        return $this->access->allows($user, $organization, 'diary.view_all') || $this->access->allows($user, $organization, 'cases.view_all');
    }

    private function at(Carbon $date, ?string $time): Carbon
    {
        return $time ? $date->copy()->setTimeFromTimeString($time) : $date->copy()->startOfDay();
    }

    /**
     * Fills defaults and formats times as local "Y-m-d\TH:i" (Asia/Karachi).
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function item(array $item): array
    {
        return [
            'subtitle' => null, 'description' => null, 'location' => null, 'case' => null, 'client' => null, 'lawyer' => null,
            'ghost' => false, 'moved_to' => null, 'original_start' => null, 'reason' => null, 'manage_url' => null,
            'has_history' => false, 'hearing' => null, 'recurrence' => 'none', 'recurrence_label' => null, 'visibility' => null, 'owner' => null, 'editable' => null,
            'can' => ['edit' => false, 'reschedule' => false, 'cancel' => false, 'complete' => false],
            ...$item,
            'start' => $item['start'] instanceof Carbon ? $item['start']->format('Y-m-d\TH:i') : $item['start'],
            'end' => $item['end'] instanceof Carbon ? $item['end']->format('Y-m-d\TH:i') : $item['end'],
        ];
    }
}
