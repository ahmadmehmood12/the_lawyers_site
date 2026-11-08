<?php

namespace App\Notifications;

use App\Models\Appointment;

class AppointmentUpdated extends PlatformNotification
{
    public function __construct(public Appointment $appointment, public string $change, public bool $forClient) {}

    public function event(): string
    {
        return 'appointment';
    }

    public function content(object $notifiable): array
    {
        $when = $this->appointment->starts_at->translatedFormat('D d M, H:i');

        return [
            'title' => match ($this->change) {
                'requested' => __('New consultation request for :when', ['when' => $when]),
                'confirmed' => __('Appointment confirmed for :when', ['when' => $when]),
                'rescheduled' => __('Appointment moved to :when', ['when' => $when]),
                'declined' => __('Appointment request declined'),
                'cancelled' => __('Appointment on :when cancelled', ['when' => $when]),
                default => __('Appointment update'),
            },
            'body' => $this->forClient ? $this->appointment->lawyer->name : $this->appointment->contact_name,
            'url' => route($this->forClient ? 'portal.appointments.index' : 'appointments.index'),
            'icon' => 'clock',
        ];
    }
}
