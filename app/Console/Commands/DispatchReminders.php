<?php

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Enums\DeliveryStatus;
use App\Enums\HearingStatus;
use App\Enums\NotificationChannel;
use App\Models\Appointment;
use App\Models\Hearing;
use App\Models\NotificationDelivery;
use App\Models\ReminderSetting;
use App\Notifications\AppointmentReminder;
use App\Notifications\HearingReminder;
use App\Services\Notifications\HearingRecipients;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

/**
 * Daily reminder run (scheduled 07:00 PKT). For each organization's configured
 * offsets (default 7/3/1/0 days) it notifies about hearings and appointments.
 * Each (subject, date, offset, recipient) is claimed once in notification_deliveries,
 * so re-running the command never sends duplicates.
 */
#[Signature('reminders:dispatch {--date= : Pretend today is this date (YYYY-MM-DD)}')]
#[Description('Send hearing and appointment reminders for the configured offsets')]
class DispatchReminders extends Command
{
    public function handle(HearingRecipients $recipients): int
    {
        $today = $this->option('date') ? Carbon::parse($this->option('date'))->startOfDay() : today();
        $sent = 0;

        $settings = ReminderSetting::query()->get()->groupBy(fn ($s) => $s->organization_id.':'.$s->event);
        $offsetsFor = function (int $organizationId, string $event) use ($settings): array {
            $rows = $settings->get($organizationId.':'.$event);

            return $rows
                ? $rows->map(fn ($r) => ['days' => $r->days_before, 'lawyer' => $r->notify_lawyer, 'client' => $r->notify_client])->all()
                : array_map(fn ($d) => ['days' => $d, 'lawyer' => true, 'client' => true], config('legal.default_reminders.'.$event, []));
        };

        $maxOffset = max([7, ...ReminderSetting::query()->pluck('days_before')->all()]);

        Hearing::query()->where('status', HearingStatus::Scheduled->value)
            ->whereBetween('hearing_date', [$today->toDateString(), $today->copy()->addDays($maxOffset)->toDateString()])
            ->with('legalCase')
            ->chunkById(200, function ($hearings) use ($today, $offsetsFor, $recipients, &$sent): void {
                foreach ($hearings as $hearing) {
                    $days = (int) $today->diffInDays($hearing->hearing_date, false);

                    foreach ($offsetsFor($hearing->organization_id, 'hearing') as $offset) {
                        if ($offset['days'] !== $days || ! $this->claim('hearing', $hearing->id, $hearing->hearing_date->toDateString(), $days, $hearing->organization_id)) {
                            continue;
                        }

                        $recipients->notify($hearing, fn (bool $forClient, ?int $clientId) => new HearingReminder($hearing, $days, $forClient, $clientId), $offset['lawyer'], $offset['client']);
                        $sent++;
                    }
                }
            });

        Appointment::query()->where('status', AppointmentStatus::Confirmed->value)
            ->whereBetween('starts_at', [$today->copy()->startOfDay(), $today->copy()->addDays(7)->endOfDay()])
            ->with(['lawyer', 'client.user'])
            ->chunkById(200, function ($appointments) use ($today, $offsetsFor, &$sent): void {
                foreach ($appointments as $appointment) {
                    $days = (int) $today->diffInDays($appointment->starts_at->copy()->startOfDay(), false);

                    foreach ($offsetsFor($appointment->organization_id, 'appointment') as $offset) {
                        if ($offset['days'] !== $days || ! $this->claim('appointment', $appointment->id, $appointment->starts_at->toDateString(), $days, $appointment->organization_id)) {
                            continue;
                        }

                        if ($offset['lawyer']) {
                            $appointment->lawyer->notify(new AppointmentReminder($appointment, $days, false));
                        }
                        if ($offset['client'] && $appointment->client?->user) {
                            $appointment->client->user->notify(new AppointmentReminder($appointment, $days, true));
                        } elseif ($offset['client']) {
                            // No portal account: email the client record (or booking contact); WhatsApp only with consent.
                            $record = $appointment->client;
                            $email = $record?->email ?? $appointment->contact_email;
                            $route = $email ? Notification::route('mail', [$email => $record?->name ?? $appointment->contact_name]) : null;
                            if ($record?->hasWhatsAppConsent() && $record->whatsAppNumber()) {
                                $route = ($route ?? Notification::route('whatsapp', $record->whatsAppNumber()))->route('whatsapp', $record->whatsAppNumber());
                            }
                            $route?->notify((new AppointmentReminder($appointment, $days, true))->locale($record?->preferred_locale ?: 'en'));
                        }
                        $sent++;
                    }
                }
            });

        $this->info("Reminder batches dispatched: {$sent}");

        return self::SUCCESS;
    }

    /** Atomically claims a reminder slot; false if it was already sent. */
    private function claim(string $type, int $id, string $date, int $days, int $organizationId): bool
    {
        return NotificationDelivery::query()->insertOrIgnore([
            'channel' => NotificationChannel::InApp->value,
            'event' => $type.'_reminder',
            'subject_type' => $type === 'hearing' ? (new Hearing)->getMorphClass() : (new Appointment)->getMorphClass(),
            'subject_id' => $id,
            'organization_id' => $organizationId,
            'recipient' => 'batch',
            'status' => DeliveryStatus::Sent->value,
            'dedupe_key' => "reminder:{$type}:{$id}:{$date}:{$days}",
            'sent_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]) === 1;
    }
}
