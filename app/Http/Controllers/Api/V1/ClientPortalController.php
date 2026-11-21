<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Http\Controllers\Portal\PortalController;
use App\Http\Requests\Appointments\BookAppointmentRequest;
use App\Http\Requests\Appointments\CancelAppointmentRequest;
use App\Http\Requests\Appointments\RescheduleAppointmentRequest;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Services\Appointments\AppointmentService;
use App\Support\InertiaPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Client portal for the mobile app (account type client). Reads run the web PortalController
 * methods themselves; bookings, cancellations and reschedules call AppointmentService with the
 * same form requests and policies, so the same emails / WhatsApp / in-app / push go out.
 * Swagger: app/Swagger/ClientPortalControllerDocs.php.
 */
class ClientPortalController extends ApiController
{
    /** @param  array<string, mixed>  $parameters */
    private function page(string $method, array $parameters = [], ?array $only = null): JsonResponse
    {
        return $this->success(InertiaPayload::props(app()->call([app(PortalController::class), $method], $parameters), $only));
    }

    public function dashboard(): JsonResponse
    {
        return $this->page('dashboard');
    }

    public function cases(): JsonResponse
    {
        return $this->page('listCases', only: ['cases']);
    }

    public function showCase(LegalCase $case): JsonResponse
    {
        return $this->page('showCase', ['case' => $case]);
    }

    public function documents(): JsonResponse
    {
        return $this->page('documents');
    }

    public function invoices(): JsonResponse
    {
        return $this->page('invoices', only: ['invoices']);
    }

    public function showInvoice(Invoice $invoice): JsonResponse
    {
        return $this->page('showInvoice', ['invoice' => $invoice]);
    }

    public function appointments(): JsonResponse
    {
        return $this->page('appointments', only: ['appointments']);
    }

    public function favourites(): JsonResponse
    {
        return $this->page('favourites', only: ['lawyers']);
    }

    public function book(BookAppointmentRequest $request, LawyerProfile $lawyer, AppointmentService $service): JsonResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $validated = $request->validated();
        $appointment = $service->request($request->user(), $lawyer, Carbon::parse($validated['starts_at']), AppointmentMode::from($validated['mode']), $validated['message'] ?? null);

        return $this->success(PortalController::appointment($appointment->load(['lawyer:id,name,avatar_path', 'rescheduledFrom:id,starts_at'])), __('Request sent. You will be notified when the lawyer confirms.'), 201);
    }

    public function cancel(CancelAppointmentRequest $request, Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manageAsClient', $appointment);
        $service->transition($appointment, AppointmentStatus::Cancelled, $request->validated('reason'), $request->user());

        return $this->success(PortalController::appointment($appointment->refresh()->load('lawyer:id,name,avatar_path')), __('Appointment cancelled.'));
    }

    public function slots(Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manageAsClient', $appointment);

        return $this->success(['slots' => $service->availableSlots($appointment->lawyer, today(), 14)->values()]);
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment, AppointmentService $service): JsonResponse
    {
        $this->authorize('manageAsClient', $appointment);
        $validated = $request->validated();
        $new = $service->reschedule($appointment, Carbon::parse($validated['starts_at']), $request->user(), $validated['reason'] ?? null);

        return $this->success(PortalController::appointment($new->load(['lawyer:id,name,avatar_path', 'rescheduledFrom:id,starts_at'])), __('New time requested. The lawyer will confirm it.'));
    }
}
