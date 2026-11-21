<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Workspace\AppointmentController;
use App\Http\Controllers\Workspace\CaseController;
use App\Http\Controllers\Workspace\ClientController;
use App\Http\Controllers\Workspace\DashboardController;
use App\Http\Controllers\Workspace\DiaryController;
use App\Http\Controllers\Workspace\InvoiceController;
use App\Http\Controllers\Workspace\TeamController;
use App\Http\Requests\Appointments\AppointmentStatusRequest;
use App\Http\Requests\Appointments\AvailabilityRequest;
use App\Http\Requests\Appointments\RescheduleAppointmentRequest;
use App\Http\Requests\Appointments\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\AvailabilitySlot;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\UnavailableDate;
use App\Services\Access\OrganizationAccess;
use App\Services\Appointments\AppointmentService;
use App\Support\InertiaPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Lawyer and law-firm workspace for the mobile app (account types lawyer/staff, `workspace`
 * middleware = same organization context, roles and permissions as the web). Reads run the web
 * workspace controllers themselves; appointment changes call AppointmentService with the same
 * form requests and policies, so every notification (email, WhatsApp, in-app, push) matches.
 * Swagger: app/Swagger/WorkspaceControllerDocs.php.
 */
class WorkspaceController extends ApiController
{
    /**
     * @param  class-string  $controller
     * @param  array<string, mixed>  $parameters
     * @param  list<string>|null  $only
     */
    private function page(string $controller, string $method, array $parameters = [], ?array $only = null): JsonResponse
    {
        return $this->success(InertiaPayload::props(app()->call([app($controller), $method], $parameters), $only));
    }

    public function dashboard(): JsonResponse
    {
        return $this->page(DashboardController::class, '__invoke');
    }

    public function cases(): JsonResponse
    {
        return $this->page(CaseController::class, 'index');
    }

    public function showCase(LegalCase $case): JsonResponse
    {
        return $this->page(CaseController::class, 'show', ['case' => $case]);
    }

    public function diary(): JsonResponse
    {
        return $this->page(DiaryController::class, 'index');
    }

    public function clients(): JsonResponse
    {
        return $this->page(ClientController::class, 'index');
    }

    public function showClient(Client $client): JsonResponse
    {
        return $this->page(ClientController::class, 'show', ['client' => $client]);
    }

    public function invoices(): JsonResponse
    {
        return $this->page(InvoiceController::class, 'index');
    }

    public function showInvoice(Invoice $invoice): JsonResponse
    {
        return $this->page(InvoiceController::class, 'show', ['invoice' => $invoice]);
    }

    public function team(): JsonResponse
    {
        return $this->page(TeamController::class, 'index');
    }

    /** scope = upcoming (default) | requests | past; lawyer_id filters for members who manage all. */
    public function appointments(Request $request, OrganizationAccess $access): JsonResponse
    {
        $organization = $this->organization();
        $user = $request->user();
        $manageAll = $access->allows($user, $organization, 'appointments.manage');
        abort_unless($manageAll || $user->isLawyer(), 403);
        $scope = in_array($request->query('scope'), ['upcoming', 'requests', 'past'], true) ? (string) $request->query('scope') : 'upcoming';

        $page = AppointmentController::listQuery($user, $organization, $manageAll, $scope, $request->integer('lawyer_id') ?: null)
            ->paginate(25)->through(fn (Appointment $a) => AppointmentController::present($a));

        return $this->paginated($page);
    }

    public function showAppointment(Appointment $appointment): JsonResponse
    {
        $this->authorize('manage', $appointment);

        return $this->success(AppointmentController::present($appointment->load(['lawyer:id,name', 'client:id,name,phone'])));
    }

    public function storeAppointment(StoreAppointmentRequest $request, AppointmentService $service): JsonResponse
    {
        $organization = $this->organization();
        $validated = $request->validated();
        $lawyer = $service->resolveLawyer($request->user(), $organization, isset($validated['lawyer_id']) ? (int) $validated['lawyer_id'] : null);
        $appointment = $service->createByLawyer($organization, $lawyer, $validated);

        return $this->success(AppointmentController::present($appointment->load(['lawyer:id,name', 'client:id,name,phone'])), __('Appointment added.'), 201);
    }

    /** Accept (confirmed), decline, cancel, complete or mark as no_show. */
    public function transitionAppointment(AppointmentStatusRequest $request, Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validated();
        $service->transition($appointment, AppointmentStatus::from($validated['status']), $validated['reason'] ?? null, $request->user(), $validated['meeting_link'] ?? null);

        return $this->success(AppointmentController::present($appointment->refresh()->load(['lawyer:id,name', 'client:id,name,phone'])), __('Appointment updated.'));
    }

    public function rescheduleAppointment(RescheduleAppointmentRequest $request, Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manage', $appointment);
        $validated = $request->validated();
        $new = $service->reschedule($appointment, Carbon::parse($validated['starts_at']), $request->user(), $validated['reason'] ?? null);

        return $this->success(AppointmentController::present($new->load(['lawyer:id,name', 'client:id,name,phone'])), __('Appointment rescheduled.'));
    }

    public function availability(Request $request): JsonResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        $user = $request->user();

        return $this->success([
            'slots' => AvailabilitySlot::query()->where('user_id', $user->id)->orderBy('weekday')->orderBy('starts_at')->get(['id', 'weekday', 'starts_at', 'ends_at', 'mode']),
            'holidays' => UnavailableDate::query()->where('user_id', $user->id)->whereDate('date', '>=', today())->orderBy('date')->get(['id', 'date', 'reason']),
        ]);
    }

    public function updateAvailability(AvailabilityRequest $request, AppointmentService $service): JsonResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        $service->saveAvailability($request->user(), $request->validated('slots') ?? []);

        return $this->availability($request);
    }
}
