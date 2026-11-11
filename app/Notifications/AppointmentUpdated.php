<?php

namespace App\Notifications;

use App\Enums\AppointmentMode;
use App\Models\Appointment;
use Illuminate\Notifications\AnonymousNotifiable;

/**
 * Every appointment lifecycle message (docs/Modules/Appointments.md, Notification matrix):
 * requested (to lawyer), booked (receipt to client), confirmed, declined, rescheduled,
 * reschedule_requested, cancelled, completed, no_show. Email uses the branded template
 * (key appointment_{change}, editable in Admin); WhatsApp uses template appointment_{change}.
 */
class AppointmentUpdated extends PlatformNotification
{
    public function __construct(public Appointment $appointment, public string $change, public bool $forClient) {}

    public function event(): string
    {
        return 'appointment';
    }

    public function mailTemplateKey(): string
    {
        return 'appointment_'.$this->change;
    }

    private function when(): string
    {
        return $this->appointment->starts_at->translatedFormat('l, d F Y, h:i A');
    }

    public function content(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['lawyer:id,name', 'client:id,name']);
        $when = $a->starts_at->translatedFormat('D d M, h:i A');
        $other = $this->forClient ? $a->lawyer->name : ($a->client?->name ?? $a->contact_name);

        return [
            'title' => match ($this->change) {
                'requested' => __('New consultation request for :when', ['when' => $when]),
                'booked' => __('Your consultation request was sent for :when', ['when' => $when]),
                'confirmed' => __('Appointment confirmed for :when', ['when' => $when]),
                'declined' => __('Appointment request declined'),
                'rescheduled' => __('Appointment moved to :when', ['when' => $when]),
                'reschedule_requested' => __('New time requested: :when', ['when' => $when]),
                'cancelled' => __('Appointment on :when cancelled', ['when' => $when]),
                'completed' => __('Consultation marked as completed'),
                'no_show' => __('Appointment marked as missed'),
                default => __('Appointment update'),
            },
            'body' => match ($this->change) {
                'requested' => __(':name asked for a consultation. Accept or decline it from your appointments.', ['name' => $other]),
                'booked' => __('We sent your request to :name. You will be notified as soon as it is accepted.', ['name' => $other]),
                'confirmed' => __(':name accepted your consultation.', ['name' => $other]),
                'declined' => __(':name could not take this consultation.', ['name' => $other]),
                'rescheduled' => __('Your consultation with :name has a new date and time.', ['name' => $other]),
                'reschedule_requested' => __('A new time was requested for the consultation with :name. It needs the lawyer’s confirmation.', ['name' => $other]),
                'cancelled' => __('Your consultation with :name was cancelled.', ['name' => $other]),
                default => __('Consultation with :name.', ['name' => $other]),
            },
            'url' => route($this->forClient ? 'portal.appointments.index' : 'appointments.index'),
            'icon' => 'clock',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['lawyer:id,name', 'client:id,name']);
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => [
                __('Lawyer') => $a->lawyer->name,
                __('Client') => $a->client?->name ?? $a->contact_name,
                __('Date and time') => $this->when(),
                __('Consultation type') => $a->mode === AppointmentMode::Online ? __('Online') : __('In person'),
                __('Status') => $a->status->label(),
                __('Meeting link') => $a->mode === AppointmentMode::Online && $a->status->value === 'confirmed' ? $a->meeting_link : null,
                __('Reason') => in_array($this->change, ['declined', 'cancelled'], true) ? $a->cancellation_reason : null,
            ],
            'action_label' => $this->forClient ? __('View my appointments') : __('Open appointments'),
            'action_url' => $notifiable instanceof AnonymousNotifiable ? null : $content['url'],
            'notice' => in_array($this->change, ['confirmed', 'rescheduled'], true) ? __('Please be on time. If you cannot attend, cancel or ask for a new time so the slot can be offered to someone else.') : null,
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['lawyer:id,name', 'client:id,name']);

        return ['lawyer' => $a->lawyer->name, 'client' => $a->client?->name ?? $a->contact_name, 'date' => $this->when(), 'status' => $a->status->label()];
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        if (! in_array($this->change, ['requested', 'booked', 'confirmed', 'declined', 'rescheduled', 'reschedule_requested', 'cancelled'], true)) {
            return null;
        }

        $a = $this->appointment->loadMissing(['lawyer:id,name', 'client:id,name']);

        return [
            'key' => 'appointment_'.$this->change,
            'variables' => [
                $this->recipientName($notifiable),
                $this->forClient ? $a->lawyer->name : ($a->client?->name ?? $a->contact_name),
                $a->starts_at->format('d M Y, h:i A'),
                $a->mode === AppointmentMode::Online ? __('Online') : __('In person'),
            ],
            'subject' => $a,
            'organization_id' => $a->organization_id,
            'client_id' => $this->forClient ? $a->client_id : null,
            'dedupe' => 'wa:appointment:'.$a->id.':'.$this->change.':'.($this->forClient ? 'client' : 'lawyer'),
        ];
    }
}
