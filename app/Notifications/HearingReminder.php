<?php

namespace App\Notifications;

use App\Models\Hearing;

class HearingReminder extends PlatformNotification
{
    public function __construct(public Hearing $hearing, public int $daysBefore, public bool $forClient = false, public ?int $clientId = null) {}

    public function event(): string
    {
        return 'hearing_reminder';
    }

    public function content(object $notifiable): array
    {
        $h = $this->hearing->loadMissing(['legalCase:id,title,reference', 'court:id,name']);
        $when = $this->daysBefore === 0 ? __('today') : trans_choice('in :count day|in :count days', $this->daysBefore, ['count' => $this->daysBefore]);

        return [
            'title' => __('Hearing :when: :case', ['when' => $when, 'case' => $h->legalCase->title]),
            'body' => __(':date :time at :court. Purpose: :purpose', [
                'date' => $h->hearing_date->translatedFormat('D d M Y'),
                'time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : '',
                'court' => $h->court?->name ?? __('court'),
                'purpose' => $h->purpose ?: $h->hearing_type?->label(),
            ]),
            'url' => $this->forClient ? route('portal.cases.show', $h->legal_case_id) : route('cases.show', ['case' => $h->legal_case_id, 'tab' => 'hearings']),
            'icon' => 'calendar',
        ];
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        $h = $this->hearing->loadMissing(['legalCase:id,title', 'court:id,name']);

        return [
            'key' => 'hearing_reminder',
            'variables' => [
                $notifiable->name ?? __('Client'),
                $h->legalCase->title,
                $h->hearing_date->format('d M Y'),
                $h->hearing_time ? substr($h->hearing_time, 0, 5) : '-',
                $h->court?->name ?? '-',
            ],
            'subject' => $h,
            'organization_id' => $h->organization_id,
            'client_id' => $this->clientId,
            'dedupe' => 'wa:hearing:'.$h->id.':'.$h->hearing_date->toDateString().':'.$this->daysBefore.':'.($this->clientId ? 'client:'.$this->clientId : 'user:'.($notifiable->id ?? 'x')),
        ];
    }
}
