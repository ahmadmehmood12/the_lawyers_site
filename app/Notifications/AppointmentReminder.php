<?php

namespace App\Notifications;

use App\Models\Appointment;

class AppointmentReminder extends PlatformNotification
{
    public function __construct(public Appointment $appointment, public int $daysBefore, public bool $forClient) {}

    public function event(): string
    {
        return 'appointment';
    }

    public function content(object $notifiable): array
    {
        $a = $this->appointment->loadMissing('lawyer:id,name');

        return [
            'title' => __('Appointment reminder: :date', ['date' => $a->starts_at->translatedFormat('D d M, H:i')]),
            'body' => $this->forClient ? __('Consultation with :lawyer.', ['lawyer' => $a->lawyer->name]) : __('Consultation with :name.', ['name' => $a->contact_name]),
            'url' => $this->forClient ? route('portal.appointments.index') : route('appointments.index'),
            'icon' => 'clock',
        ];
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        $a = $this->appointment->loadMissing('lawyer:id,name');

        return [
            'key' => 'appointment_reminder',
            'variables' => [$notifiable->name ?? '', $a->lawyer->name, $a->starts_at->format('d M Y H:i')],
            'subject' => $a,
            'organization_id' => $a->organization_id,
            'dedupe' => 'wa:appointment:'.$a->id.':'.$this->daysBefore.':'.($notifiable->id ?? 'x'),
        ];
    }
}
