<?php

namespace App\Notifications;

use App\Models\Hearing;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Carbon;

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
            'url' => $notifiable instanceof AnonymousNotifiable ? null : ($this->forClient ? route('portal.cases.show', $h->legal_case_id) : route('cases.show', ['case' => $h->legal_case_id, 'tab' => 'hearings'])),
            'icon' => 'calendar',
        ];
    }

    /** Branded reminder email: case, court, date, people and what to bring (docs/Features/Email-Templates.md). */
    public function mailData(object $notifiable): array
    {
        $h = $this->hearing->loadMissing(['legalCase:id,title,reference,case_number', 'legalCase.clients:id,name', 'court:id,name', 'judge:id,name', 'assignedLawyer:id,name,phone']);
        $content = $this->content($notifiable);
        $instructions = $this->forClient
            ? __('Please reach the court at least 30 minutes early with your CNIC and any documents your lawyer asked for. Contact your lawyer if you cannot attend.')
            : __('Check the file, the last order and any documents due before the hearing.');

        return [
            'subject' => $content['title'],
            'heading' => $this->daysBefore === 1 ? __('Hearing reminder: tomorrow') : $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [__('This is a reminder of the upcoming hearing below.')],
            'details' => [
                __('Case') => $h->legalCase->title,
                __('Case number') => $h->legalCase->case_number ?: $h->legalCase->reference,
                __('Court') => $h->court?->name,
                __('Room') => $h->courtroom,
                __('Judge') => $h->judge?->name ?? $h->judge_name,
                __('Date and time') => $h->hearing_date->translatedFormat('l, d F Y').($h->hearing_time ? ', '.Carbon::parse($h->hearing_time)->format('h:i A') : ''),
                __('Purpose') => $h->purpose ?: $h->hearing_type?->label(),
                __('Lawyer') => $h->assignedLawyer?->name,
                __('Client') => $this->forClient ? null : $h->legalCase->clients->pluck('name')->join(', '),
                __('Preparation notes') => $this->forClient ? null : $h->preparation_notes,
            ],
            'action_label' => $this->forClient ? __('View my case') : __('Open the case file'),
            'action_url' => $content['url'],
            'notice' => $instructions,
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        $h = $this->hearing->loadMissing(['legalCase:id,title,reference,case_number', 'court:id,name']);

        return ['case' => $h->legalCase->title, 'court' => $h->court?->name, 'date' => $h->hearing_date->translatedFormat('d F Y'), 'time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : ''];
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
