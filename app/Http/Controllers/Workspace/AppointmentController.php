<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AvailabilitySlot;
use App\Models\UnavailableDate;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Appointments\AppointmentService;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        $manageAll = $access->allows($user, $organization, 'appointments.manage');
        abort_unless($manageAll || $user->isLawyer(), 403);
        $scope = $request->query('scope', 'upcoming');

        $appointments = Appointment::query()->forOrganization($organization)
            ->when(! $manageAll, fn ($q) => $q->where('lawyer_id', $user->id))
            ->when($request->integer('lawyer_id'), fn ($q, $id) => $q->where('lawyer_id', $id))
            ->when($scope === 'upcoming', fn ($q) => $q->where('starts_at', '>=', now()->startOfDay())->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value]))
            ->when($scope === 'requests', fn ($q) => $q->where('status', AppointmentStatus::Requested->value))
            ->when($scope === 'past', fn ($q) => $q->where(fn ($w) => $w->where('starts_at', '<', now()->startOfDay())->orWhereNotIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value])))
            ->with(['lawyer:id,name', 'client:id,name,phone'])
            ->orderBy('starts_at', $scope === 'past' ? 'desc' : 'asc')->paginate(25)->withQueryString()
            ->through(fn (Appointment $a) => [
                'id' => $a->id, 'starts_at' => $a->starts_at->toIso8601String(), 'ends_at' => $a->ends_at->toIso8601String(),
                'status' => $a->status->value, 'status_label' => $a->status->label(), 'mode' => $a->mode->value, 'mode_label' => $a->mode->label(),
                'contact_name' => $a->contact_name, 'contact_phone' => $a->contact_phone, 'client_id' => $a->client_id,
                'lawyer' => $a->lawyer->name, 'client_message' => $a->client_message, 'lawyer_notes' => $a->lawyer_notes,
                'meeting_link' => $a->meeting_link, 'fee' => $a->fee, 'cancellation_reason' => $a->cancellation_reason,
            ]);

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

    public function store(Request $request, AppointmentService $service): RedirectResponse
    {
        $organization = $this->organization();
        $validated = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'contact_name' => ['required_without:client_id', 'nullable', 'string', 'max:160'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'lawyer_id' => ['nullable', 'integer'],
            'starts_at' => ['required', 'date', 'after:now'],
            'duration' => ['required', 'integer', 'between:15,240'],
            'mode' => ['required', Rule::enum(AppointmentMode::class)],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'meeting_link' => ['nullable', 'url:https', 'max:255'],
            'lawyer_notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $lawyer = $request->user();
        if (! empty($validated['lawyer_id']) && (int) $validated['lawyer_id'] !== $lawyer->id) {
            abort_unless(app(OrganizationAccess::class)->allows($lawyer, $organization, 'appointments.manage'), 403);
            $lawyer = User::findOrFail($validated['lawyer_id']);
            abort_unless(app(OrganizationAccess::class)->isMember($lawyer, $organization), 404);
        }

        $service->createByLawyer($organization, $lawyer, $validated);

        return back()->with('success', __('Appointment added.'));
    }

    public function transition(Request $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'declined', 'cancelled', 'completed', 'no_show'])],
            'reason' => ['nullable', 'required_if:status,declined,cancelled', 'string', 'max:255'],
            'meeting_link' => ['nullable', 'url:https', 'max:255'],
        ]);

        if (! empty($validated['meeting_link'])) {
            $appointment->update(['meeting_link' => $validated['meeting_link']]);
        }
        $service->transition($appointment, AppointmentStatus::from($validated['status']), $validated['reason'] ?? null, $request->user());

        return back()->with('success', __('Appointment updated.'));
    }

    public function reschedule(Request $request, Appointment $appointment, AppointmentService $service): RedirectResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validate(['starts_at' => ['required', 'date', 'after:now'], 'reason' => ['nullable', 'string', 'max:255']]);
        $service->reschedule($appointment, Carbon::parse($validated['starts_at']), $request->user(), $validated['reason'] ?? null);

        return back()->with('success', __('Appointment rescheduled.'));
    }

    public function updateAvailability(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        $validated = $request->validate([
            'slots' => ['array', 'max:50'],
            'slots.*.weekday' => ['required', 'integer', 'between:0,6'],
            'slots.*.starts_at' => ['required', 'date_format:H:i'],
            'slots.*.ends_at' => ['required', 'date_format:H:i', 'after:slots.*.starts_at'],
            'slots.*.mode' => ['required', Rule::in(['online', 'in_person', 'both'])],
        ]);

        AvailabilitySlot::query()->where('user_id', $request->user()->id)->delete();
        foreach ($validated['slots'] ?? [] as $slot) {
            AvailabilitySlot::create([...$slot, 'user_id' => $request->user()->id]);
        }

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
