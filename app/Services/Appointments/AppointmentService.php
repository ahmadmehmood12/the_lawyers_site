<?php

namespace App\Services\Appointments;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\AppointmentUpdated;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Consultations and appointments (docs/Modules/Appointments.md).
 * Slots come from the lawyer's weekly availability minus holidays and
 * already-booked (requested/confirmed) appointments.
 */
class AppointmentService
{
    public const SLOT_MINUTES = 30;

    /**
     * @return Collection<int, array{starts_at: string, mode: string}>
     */
    public function availableSlots(User $lawyer, Carbon $from, int $days = 14): Collection
    {
        $slots = $lawyer->availabilitySlots()->get()->groupBy('weekday');
        $holidays = $lawyer->unavailableDates()->whereBetween('date', [$from->toDateString(), $from->copy()->addDays($days)->toDateString()])->pluck('date')->map->toDateString()->all();
        $booked = Appointment::query()->where('lawyer_id', $lawyer->id)
            ->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value])
            ->whereBetween('starts_at', [$from, $from->copy()->addDays($days + 1)])
            ->get(['starts_at', 'ends_at']);

        $result = collect();
        for ($d = 0; $d <= $days; $d++) {
            $day = $from->copy()->addDays($d)->startOfDay();
            if (in_array($day->toDateString(), $holidays, true)) {
                continue;
            }
            foreach ($slots->get($day->dayOfWeek, []) as $window) {
                $cursor = $day->copy()->setTimeFromTimeString($window->starts_at);
                $end = $day->copy()->setTimeFromTimeString($window->ends_at);
                while ($cursor->copy()->addMinutes(self::SLOT_MINUTES)->lte($end)) {
                    $slotEnd = $cursor->copy()->addMinutes(self::SLOT_MINUTES);
                    $clash = $booked->contains(fn ($a) => $a->starts_at->lt($slotEnd) && $a->ends_at->gt($cursor));
                    if (! $clash && $cursor->isFuture()) {
                        $result->push(['starts_at' => $cursor->toIso8601String(), 'mode' => $window->mode]);
                    }
                    $cursor = $slotEnd;
                }
            }
        }

        return $result;
    }

    /** A client books a consultation from the public profile. */
    public function request(User $clientUser, LawyerProfile $profile, Carbon $startsAt, AppointmentMode $mode, ?string $message): Appointment
    {
        if (! $profile->accepting_clients) {
            throw ValidationException::withMessages(['starts_at' => __('This lawyer is not accepting new clients.')]);
        }

        $lawyer = $profile->user;
        if (! $this->availableSlots($lawyer, $startsAt->copy()->startOfDay(), 0)->contains(fn ($s) => Carbon::parse($s['starts_at'])->equalTo($startsAt))) {
            throw ValidationException::withMessages(['starts_at' => __('This time is no longer available. Please choose another slot.')]);
        }

        $organization = $lawyer->organizations()->orderByRaw("organizations.type = 'solo' DESC")->firstOrFail();

        return DB::transaction(function () use ($clientUser, $lawyer, $organization, $startsAt, $mode, $message, $profile): Appointment {
            $client = Client::query()->firstOrCreate(
                ['organization_id' => $organization->id, 'user_id' => $clientUser->id],
                ['type' => 'individual', 'name' => $clientUser->name, 'email' => $clientUser->email, 'phone' => $clientUser->phone, 'preferred_locale' => $clientUser->locale],
            );

            $appointment = $organization->appointments()->create([
                'lawyer_id' => $lawyer->id, 'client_id' => $client->id, 'requested_by' => $clientUser->id,
                'contact_name' => $clientUser->name, 'contact_phone' => $clientUser->phone, 'contact_email' => $clientUser->email,
                'mode' => $mode, 'kind' => 'consultation', 'starts_at' => $startsAt, 'ends_at' => $startsAt->copy()->addMinutes(self::SLOT_MINUTES),
                'status' => AppointmentStatus::Requested, 'client_message' => $message, 'fee' => $profile->consultation_fee_min,
            ]);

            DB::afterCommit(fn () => $lawyer->notify(new AppointmentUpdated($appointment, 'requested', false)));

            return $appointment;
        });
    }

    /** @param  array<string, mixed>  $data */
    public function createByLawyer(Organization $organization, User $lawyer, array $data): Appointment
    {
        $client = isset($data['client_id']) ? Client::query()->forOrganization($organization)->findOrFail($data['client_id']) : null;
        $start = Carbon::parse($data['starts_at']);

        return $organization->appointments()->create([
            'lawyer_id' => $lawyer->id, 'client_id' => $client?->id, 'legal_case_id' => $data['legal_case_id'] ?? null,
            'contact_name' => $client?->name ?? $data['contact_name'], 'contact_phone' => $client?->phone ?? ($data['contact_phone'] ?? null),
            'mode' => $data['mode'], 'kind' => $data['kind'] ?? 'meeting', 'starts_at' => $start, 'ends_at' => $start->copy()->addMinutes((int) ($data['duration'] ?? 30)),
            'status' => AppointmentStatus::Confirmed, 'fee' => $data['fee'] ?? null, 'lawyer_notes' => $data['lawyer_notes'] ?? null, 'meeting_link' => $data['meeting_link'] ?? null,
        ]);
    }

    public function transition(Appointment $appointment, AppointmentStatus $to, ?string $reason, User $actor): Appointment
    {
        $allowed = match ($appointment->status) {
            AppointmentStatus::Requested => [AppointmentStatus::Confirmed, AppointmentStatus::Declined, AppointmentStatus::Cancelled],
            AppointmentStatus::Confirmed => [AppointmentStatus::Completed, AppointmentStatus::Cancelled, AppointmentStatus::NoShow],
            default => [],
        };

        if (! in_array($to, $allowed, true)) {
            throw ValidationException::withMessages(['status' => __('This status change is not allowed.')]);
        }

        $appointment->update(['status' => $to, 'cancellation_reason' => in_array($to, [AppointmentStatus::Cancelled, AppointmentStatus::Declined], true) ? $reason : $appointment->cancellation_reason]);
        $this->notifyOtherSide($appointment, $to->value, $actor);

        return $appointment;
    }

    public function reschedule(Appointment $appointment, Carbon $startsAt, User $actor): Appointment
    {
        if (! in_array($appointment->status, [AppointmentStatus::Requested, AppointmentStatus::Confirmed], true)) {
            throw ValidationException::withMessages(['starts_at' => __('Only open appointments can be rescheduled.')]);
        }

        return DB::transaction(function () use ($appointment, $startsAt, $actor): Appointment {
            $duration = $appointment->starts_at->diffInMinutes($appointment->ends_at);
            $new = $appointment->replicate(['status', 'rescheduled_from_id']);
            $new->fill(['starts_at' => $startsAt, 'ends_at' => $startsAt->copy()->addMinutes($duration), 'status' => AppointmentStatus::Confirmed, 'rescheduled_from_id' => $appointment->id])->save();
            $appointment->update(['status' => AppointmentStatus::Cancelled, 'cancellation_reason' => __('Rescheduled')]);
            $this->notifyOtherSide($new, 'rescheduled', $actor);

            return $new;
        });
    }

    private function notifyOtherSide(Appointment $appointment, string $change, User $actor): void
    {
        $appointment->loadMissing(['lawyer', 'client.user']);
        $clientUser = $appointment->client?->user;

        if ($actor->id !== $appointment->lawyer_id) {
            $appointment->lawyer->notify(new AppointmentUpdated($appointment, $change, false));
        }
        if ($clientUser && $clientUser->id !== $actor->id) {
            $clientUser->notify(new AppointmentUpdated($appointment, $change, true));
        }
    }
}
