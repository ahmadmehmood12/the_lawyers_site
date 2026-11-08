<?php

namespace App\Notifications;

use App\Models\Hearing;

class HearingUpdated extends PlatformNotification
{
    public function __construct(public Hearing $hearing, public string $change, public bool $forClient = false, public ?int $clientId = null) {}

    public function event(): string
    {
        return 'hearing_update';
    }

    public function content(object $notifiable): array
    {
        $h = $this->hearing->loadMissing(['legalCase:id,title']);
        $title = match ($this->change) {
            'rescheduled' => __('Hearing rescheduled to :date', ['date' => $h->hearing_date->translatedFormat('d M Y')]),
            'cancelled' => __('Hearing on :date cancelled', ['date' => $h->hearing_date->translatedFormat('d M Y')]),
            'outcome' => __('Hearing update recorded'),
            default => __('New hearing on :date', ['date' => $h->hearing_date->translatedFormat('d M Y')]),
        };

        return [
            'title' => $title,
            'body' => $h->legalCase->title.($this->forClient && $h->client_note ? ' — '.$h->client_note : ''),
            'url' => $this->forClient ? route('portal.cases.show', $h->legal_case_id) : route('cases.show', ['case' => $h->legal_case_id, 'tab' => 'hearings']),
            'icon' => 'calendar',
        ];
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        if (! in_array($this->change, ['rescheduled', 'cancelled', 'scheduled'], true)) {
            return null;
        }

        $h = $this->hearing->loadMissing(['legalCase:id,title']);

        return [
            'key' => 'hearing_'.$this->change,
            'variables' => [$notifiable->name ?? __('Client'), $h->legalCase->title, $h->hearing_date->format('d M Y')],
            'subject' => $h,
            'organization_id' => $h->organization_id,
            'client_id' => $this->clientId,
            'dedupe' => 'wa:hearing-update:'.$h->id.':'.$this->change.':'.($this->clientId ? 'client:'.$this->clientId : 'user:'.($notifiable->id ?? 'x')),
        ];
    }
}
