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

    public function mailTemplateKey(): string
    {
        return 'appointment_reminder';
    }

    public function mailData(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['lawyer:id,name', 'client:id,name']);
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [__('This is a reminder of your upcoming consultation.')],
            'details' => [
                __('Lawyer') => $a->lawyer->name,
                __('Client') => $a->client?->name ?? $a->contact_name,
                __('Date and time') => $a->starts_at->translatedFormat('l, d F Y, h:i A'),
                __('Consultation type') => $a->mode->label(),
                __('Meeting link') => $a->meeting_link,
            ],
            'action_label' => __('View appointments'),
            'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['lawyer:id,name']);

        return ['lawyer' => $a->lawyer->name, 'client' => $a->contact_name, 'date' => $a->starts_at->translatedFormat('d F Y, h:i A')];
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
