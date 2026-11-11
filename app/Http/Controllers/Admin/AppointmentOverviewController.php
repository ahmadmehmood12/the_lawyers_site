<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Support\PublicFile;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin, Appointments (organizations.view): platform-wide oversight of consultations booked
 * through the directory. Shows who, when, mode and status only; client messages and lawyer
 * notes stay private to the chambers (docs/Security/Data-Privacy.md).
 */
class AppointmentOverviewController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(AppointmentStatus::class)],
            'when' => ['nullable', Rule::in(['upcoming', 'past'])],
        ]);

        $rows = Appointment::query()
            ->with(['lawyer:id,name,avatar_path', 'organization:id,name', 'client:id,name'])
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when(($filters['when'] ?? null) === 'upcoming', fn ($q) => $q->where('starts_at', '>=', now()))
            ->when(($filters['when'] ?? null) === 'past', fn ($q) => $q->where('starts_at', '<', now()))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('contact_name', 'like', "%{$s}%")->orWhereHas('lawyer', fn ($l) => $l->where('name', 'like', "%{$s}%"))->orWhereHas('organization', fn ($o) => $o->where('name', 'like', "%{$s}%"))))
            ->orderByDesc('starts_at')->paginate(25)->withQueryString()
            ->through(fn (Appointment $a) => [
                'id' => $a->id,
                'starts_at' => $a->starts_at->toIso8601String(),
                'lawyer' => $a->lawyer->name,
                'lawyer_avatar' => PublicFile::url($a->lawyer->avatar_path),
                'organization' => $a->organization?->name,
                'client' => $a->client?->name ?? $a->contact_name,
                'mode' => $a->mode->label(),
                'kind' => $a->kind,
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
                'rescheduled' => $a->rescheduled_from_id !== null,
            ]);

        return Inertia::render('Admin/Appointments', [
            'rows' => $rows,
            'filters' => $filters,
            'statuses' => AppointmentStatus::options(),
            'counts' => Appointment::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }
}
