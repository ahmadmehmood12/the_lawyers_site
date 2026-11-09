<?php

namespace App\Http\Controllers\Shared;

use App\Enums\CalendarEventStatus;
use App\Enums\CalendarEventType;
use App\Enums\CalendarVisibility;
use App\Enums\CaseStatus;
use App\Enums\Recurrence;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\CalendarEvent;
use App\Models\Client;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Calendar\CalendarEventService;
use App\Services\Calendar\CalendarFeed;
use App\Services\Calendar\CalendarHistory;
use App\Support\ReferenceOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Full-screen calendar for every account type (lawyers, firm staff, clients, platform staff).
 * Reads hearings, appointments, tasks, diary notes and calendar events through CalendarFeed;
 * writes only calendar events. Hearings and appointments keep using their own routes.
 * See docs/Modules/Calendar.md.
 */
class CalendarController extends Controller
{
    public function __construct(private CalendarFeed $feed) {}

    public function index(Request $request, OrganizationAccess $access): Response
    {
        $user = $request->user();
        $organization = $this->feed->organizationFor($user);
        $seesAll = $organization && ($access->allows($user, $organization, 'diary.view_all') || $access->allows($user, $organization, 'cases.view_all'));
        $managesAppointments = $organization && $access->allows($user, $organization, 'appointments.manage');

        $sources = $user->isClient()
            ? ['hearing', 'consultation']
            : ($organization ? ['hearing', 'consultation', 'task', 'note'] : []);

        return Inertia::render('Calendar/Index', [
            'area' => $user->isClient() ? 'portal' : ($user->isPlatformStaff() ? 'admin' : 'workspace'),
            'initial' => [
                'view' => in_array($request->query('view'), ['month', 'week', 'day', 'agenda'], true) ? $request->query('view') : 'month',
                'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date')) ? $request->query('date') : today()->toDateString(),
            ],
            'types' => [
                ...array_map(fn (string $t) => ['value' => $t, 'label' => match ($t) {
                    'hearing' => __('Hearings'), 'consultation' => __('Consultations'), 'task' => __('Task deadlines'), 'note' => __('Diary notes'),
                }], $sources),
                // Event types users create; 'consultation' is already listed above when appointments apply.
                ...array_values(array_filter(CalendarEventType::options(), fn (array $o) => ! in_array($o['value'], $sources, true))),
            ],
            'options' => [
                'eventTypes' => CalendarEventType::options(),
                'statuses' => CalendarEventStatus::options(),
                'recurrence' => Recurrence::options(),
                'visibility' => $organization ? CalendarVisibility::options() : [],
                'cases' => match (true) {
                    $user->isClient() => LegalCase::query()->sharedWithClientUser($user)->orderBy('title')->get(['legal_cases.id', 'title'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->title]),
                    $organization !== null => LegalCase::query()->visibleTo($user, $organization)->whereIn('status', CaseStatus::openValues())->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
                    default => [],
                },
                'clients' => $organization && $access->allows($user, $organization, 'clients.view')
                    ? Client::query()->forOrganization($organization)->orderBy('name')->limit(500)->get(['id', 'name'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->name])
                    : [],
                'members' => $organization ? ReferenceOptions::members($organization) : [],
                'lawyers' => ($seesAll || $managesAppointments) ? ReferenceOptions::members($organization, true) : [],
            ],
            'can' => ['create' => true, 'link' => $organization !== null, 'manageAppointments' => (bool) $managesAppointments || $user->isLawyer()],
            'upcoming' => Inertia::defer(fn () => $this->feed->upcoming($user)),
        ]);
    }

    /** JSON feed for a date range (the page asks again on every view or filter change). */
    public function events(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
            'types' => ['array'],
            'types.*' => ['string', 'max:30'],
            'case_id' => ['nullable', 'integer'],
            'lawyer_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['scheduled', 'rescheduled', 'completed', 'cancelled'])],
        ]);
        $from = Carbon::parse($validated['start'])->startOfDay();
        $to = Carbon::parse($validated['end'])->endOfDay();
        abort_if($from->diffInDays($to) > 100, 422, __('Choose a shorter date range.'));

        return response()->json([
            'events' => $this->feed->events($request->user(), $from, $to, [
                'types' => $validated['types'] ?? [],
                'case_id' => $validated['case_id'] ?? null,
                'lawyer_id' => $validated['lawyer_id'] ?? null,
                'status' => $validated['status'] ?? null,
            ]),
        ]);
    }

    public function store(Request $request, CalendarEventService $service): RedirectResponse
    {
        $user = $request->user();
        $service->create($user, $this->feed->organizationFor($user), $this->validated($request, true));

        return back()->with('success', __('Event added to your calendar.'));
    }

    public function update(Request $request, CalendarEvent $event, CalendarEventService $service): RedirectResponse
    {
        $this->authorize('update', $event);
        $service->update($event, $request->user(), $this->validated($request, false));

        return back()->with('success', __('Event updated.'));
    }

    public function reschedule(Request $request, CalendarEvent $event, CalendarEventService $service): RedirectResponse
    {
        $this->authorize('update', $event);
        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);
        $service->reschedule($event, $request->user(), Carbon::parse($validated['starts_at']), isset($validated['ends_at']) ? Carbon::parse($validated['ends_at']) : null, $validated['reason'] ?? null);

        return back()->with('success', __('Event rescheduled. The original time stays in its history.'));
    }

    public function cancel(Request $request, CalendarEvent $event, CalendarEventService $service): RedirectResponse
    {
        $this->authorize('update', $event);
        $service->cancel($event, $request->user(), $request->validate(['reason' => ['required', 'string', 'max:255']])['reason']);

        return back()->with('success', __('Event cancelled.'));
    }

    public function complete(Request $request, CalendarEvent $event, CalendarEventService $service): RedirectResponse
    {
        $this->authorize('update', $event);
        $service->complete($event, $request->user());

        return back()->with('success', __('Event marked as done.'));
    }

    /** Scheduling history for one item; each source is authorized with its own policy. */
    public function history(Request $request, string $source, int $id, CalendarHistory $history): JsonResponse
    {
        $user = $request->user();

        $steps = match ($source) {
            'event' => $this->authorized('view', CalendarEvent::query()->findOrFail($id), fn ($e) => $history->event($e)),
            'hearing' => $this->hearingHistory($user, Hearing::query()->findOrFail($id), $history),
            'appointment' => $this->appointmentHistory($user, Appointment::query()->findOrFail($id), $history),
            default => abort(404),
        };

        return response()->json(['steps' => $steps]);
    }

    private function hearingHistory(User $user, Hearing $hearing, CalendarHistory $history): array
    {
        $isClientsCase = $user->isClient() && $hearing->visible_to_client
            && LegalCase::query()->sharedWithClientUser($user)->whereKey($hearing->legal_case_id)->exists();
        abort_unless($isClientsCase || ($user->isProfessional() && $user->can('view', $hearing)), 404);

        $steps = $history->hearing($hearing);

        return $user->isClient() ? array_map(fn ($s) => [...$s, 'by' => null], $steps) : $steps;
    }

    private function appointmentHistory(User $user, Appointment $appointment, CalendarHistory $history): array
    {
        $allowed = $user->isClient() ? $user->can('manageAsClient', $appointment) : $user->can('manage', $appointment);
        abort_unless($allowed, 404);

        return $history->appointment($appointment);
    }

    private function authorized(string $ability, CalendarEvent $event, callable $then): array
    {
        $this->authorize($ability, $event);

        return $then($event);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $creating): array
    {
        $validated = $request->validate([
            'type' => ['required', Rule::enum(CalendarEventType::class)],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => [$creating ? 'required' : 'nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'all_day' => ['boolean'],
            'visibility' => ['nullable', Rule::enum(CalendarVisibility::class)],
            'legal_case_id' => ['nullable', 'integer'],
            'client_id' => ['nullable', 'integer'],
            'assigned_to' => ['nullable', 'integer'],
            'recurrence' => ['nullable', Rule::enum(Recurrence::class)],
            'recurrence_interval' => ['nullable', 'integer', 'between:1,12'],
            'recurrence_until' => ['nullable', 'date', 'after_or_equal:starts_at', 'required_unless:recurrence,none,null'],
        ], ['recurrence_until.required_unless' => __('Choose when a repeating event ends.')]);

        if (($validated['all_day'] ?? false) && isset($validated['starts_at'])) {
            $validated['starts_at'] = Carbon::parse($validated['starts_at'])->startOfDay();
            $validated['ends_at'] = null;
        }

        return [
            ...$validated,
            'visibility' => $validated['visibility'] ?? CalendarVisibility::Private->value,
            'recurrence' => $validated['recurrence'] ?? Recurrence::None->value,
            'recurrence_interval' => $validated['recurrence_interval'] ?? 1,
        ];
    }
}
