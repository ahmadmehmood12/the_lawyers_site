<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Appointments\AppointmentStatusRequest;
use App\Http\Requests\Appointments\AvailabilityRequest;
use App\Http\Requests\Appointments\RescheduleAppointmentRequest;
use App\Http\Requests\Appointments\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\AvailabilitySlot;
use App\Models\Organization;
use App\Models\UnavailableDate;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Appointments\AppointmentService;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    /**
     * Consultation requests waiting for an answer: the lawyer's own, or the whole organization's
     * for members allowed to manage appointments. Drives the header requests icon.
     *
     * @return Builder<Appointment>|null
     */
    public static function pendingRequests(User $user, Organization $organization): ?Builder
    {
        $manageAll = app(OrganizationAccess::class)->allows($user, $organization, 'appointments.manage');

        if (! $manageAll && ! $user->isLawyer()) {
            return null;
        }

        return Appointment::query()->forOrganization($organization)
            ->where('status', AppointmentStatus::Requested->value)
            ->when(! $manageAll, fn ($q) => $q->where('lawyer_id', $user->id));
    }

    /** Header dropdown: the latest pending requests (JSON). */
    public function recent(Request $request): JsonResponse
    {
        $query = self::pendingRequests($request->user(), $this->organization());

        return response()->json([
            'count' => $query ? (clone $query)->count() : 0,
            'items' => $query ? $query->with(['lawyer:id,name', 'client:id,name'])->latest()->limit(8)->get()->map(fn (Appointment $a) => [
                'id' => $a->id,
                'name' => $a->client?->name ?? $a->contact_name,
                'starts_at' => $a->starts_at->toIso8601String(),
                'mode' => $a->mode->label(),
                'message' => str($a->client_message)->limit(90)->toString() ?: null,
                'lawyer' => $a->lawyer?->name,
                'received_at' => $a->created_at->toIso8601String(),
            ]) : [],
            'url' => route('appointments.index', ['scope' => 'requests']),
        ]);
    }

    /**
     * Appointments a member sees: their own, or the organization's when allowed to manage them.
     * Scopes: upcoming (default), requests, past.
     *
     * @return Builder<Appointment>
     */
    public static function listQuery(User $user, Organization $organization, bool $manageAll, string $scope, ?int $lawyerId = null): Builder
    {
        return Appointment::query()->forOrganization($organization)
            ->when(! $manageAll, fn ($q) => $q->where('lawyer_id', $user->id))
            ->when($lawyerId, fn ($q, $id) => $q->where('lawyer_id', $id))
            ->when($scope === 'upcoming', fn ($q) => $q->where('starts_at', '>=', now()->startOfDay())->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value]))
            ->when($scope === 'requests', fn ($q) => $q->where('status', AppointmentStatus::Requested->value))
            ->when($scope === 'past', fn ($q) => $q->where(fn ($w) => $w->where('starts_at', '<', now()->startOfDay())->orWhereNotIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value])))
            ->with(['lawyer:id,name', 'client:id,name,phone'])
            ->orderBy('starts_at', $scope === 'past' ? 'desc' : 'asc');
    }

    /** @return array<string, mixed> */
    public static function present(Appointment $a): array
    {
        return [
            'id' => $a->id, 'starts_at' => $a->starts_at->toIso8601String(), 'ends_at' => $a->ends_at->toIso8601String(),
            'status' => $a->status->value, 'status_label' => $a->status->label(), 'mode' => $a->mode->value, 'mode_label' => $a->mode->label(),
            'contact_name' => $a->contact_name, 'contact_phone' => $a->contact_phone, 'client_id' => $a->client_id,
            'lawyer' => $a->lawyer->name, 'client_message' => $a->client_message, 'lawyer_notes' => $a->lawyer_notes,
            'meeting_link' => $a->meeting_link, 'fee' => $a->fee, 'cancellation_reason' => $a->cancellation_reason,
        ];
    }

    public function index(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        $manageAll = $access->allows($user, $organization, 'appointments.manage');
        abort_unless($manageAll || $user->isLawyer(), 403);
        $scope = $request->query('scope', 'upcoming');

        $appointments = self::listQuery($user, $organization, $manageAll, $scope, $request->integer('lawyer_id') ?: null)
            ->paginate(25)->withQueryString()
            ->through(fn (Appointment $a) => self::present($a));

        return Inertia::render('Workspace/Appointments/Index', [
            'appointments' => $appointments,
            'filters' => ['scope' => $scope, 'lawyer_id' => $request->query('lawyer_id')],
            'availability' => $user->isLawyer() ? AvailabilitySlot::query()->where('user_id', $user->id)->orderBy('weekday')->orderBy('starts_at')->get(['id', 'weekday', 'starts_at', 'ends_at', 'mode']) : [],
            'holidays' => $user->isLawyer() ? UnavailableDate::query()->where('user_id', $user->id)->whereDate('date', '>=', today())->orderBy('date')->get(['id', 'date', 'reason']) : [],
            'options' => [
                'modes' => AppointmentMode::options(),
                'clients' => ReferenceOptions::clients($organization),
                'lawyers' => $manageAll ? ReferenceOptions::members($organization, true) : [],
            ],
            'canManageAll' => $manageAll,
        ]);
    }

    public function store(StoreAppointmentRequest $request, AppointmentService $service): RedirectResponse
    {
        $organization = $this->organization();
        $validated = $request->validated();
        $lawyer = $service->resolveLawyer($request->user(), $organization, isset($validated['lawyer_id']) ? (int) $validated['lawyer_id'] : null);
        $service->createByLawyer($organization, $lawyer, $validated);

        return back()->with('success', __('Appointment added.'));
    }

    public function transition(AppointmentStatusRequest $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validated();
        $service->transition($appointment, AppointmentStatus::from($validated['status']), $validated['reason'] ?? null, $request->user(), $validated['meeting_link'] ?? null);

        return back()->with('success', __('Appointment updated.'));
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validated();
        $service->reschedule($appointment, Carbon::parse($validated['starts_at']), $request->user(), $validated['reason'] ?? null);

        return back()->with('success', __('Appointment rescheduled.'));
    }

    public function updateAvailability(AvailabilityRequest $request, AppointmentService $service): RedirectResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        $service->saveAvailability($request->user(), $request->validated('slots') ?? []);

        return back()->with('success', __('Working hours saved.'));
    }

    public function storeHoliday(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        $validated = $request->validate(['date' => ['required', 'date', 'after_or_equal:today'], 'reason' => ['nullable', 'string', 'max:160']]);
        UnavailableDate::query()->updateOrCreate(['user_id' => $request->user()->id, 'date' => $validated['date']], ['reason' => $validated['reason'] ?? null]);

        return back()->with('success', __('Day marked unavailable.'));
    }

    public function destroyHoliday(Request $request, UnavailableDate $holiday): RedirectResponse
    {
        abort_unless($holiday->user_id === $request->user()->id, 404);
        $holiday->delete();

        return back();
    }
}
