<?php

namespace App\Notifications;

use App\Enums\VerificationStatus;
use App\Models\LawyerProfile;

/**
 * Tells a lawyer when their verification status changes. Approval is a milestone email
 * with the verified badge, public profile link and next steps; the other transitions
 * (information requested, rejected, suspended) reuse the account update template.
 * Account notifications always send, ignoring per-event preferences.
 */
class VerificationStatusChanged extends AccountNotification
{
    public function __construct(public VerificationStatus $status, public ?string $note = null, public ?LawyerProfile $profile = null) {}

    public function event(): string
    {
        return 'case_update';
    }

    public function mailTemplateKey(): string
    {
        return $this->status === VerificationStatus::Approved ? 'verification_approved' : 'case_update';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return [
            'title' => $this->status === VerificationStatus::Approved
                ? __('Your lawyer profile is verified')
                : __('Verification update: :status', ['status' => $this->status->label()]),
            'body' => $this->status === VerificationStatus::Approved
                ? __('Congratulations. Our verification team approved your Bar details. The Verified badge is now visible on your public profile and clients can find you in the directory.')
                : ($this->note ?: __('Your lawyer verification status is now “:status”.', ['status' => $this->status->label()])),
            'url' => $this->status === VerificationStatus::Approved && $this->profile
                ? route('lawyers.show', $this->profile)
                : route('lawyer.verification.show'),
            'icon' => 'shield',
        ];
    }

    public function mailData(object $notifiable): array
    {
        if ($this->status !== VerificationStatus::Approved) {
            return parent::mailData($notifiable);
        }

        $content = $this->content($notifiable);
        $profile = $this->profile ?? ($notifiable->lawyerProfile ?? null);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [
                __('Good news — your lawyer profile has passed verification.'),
                __('Clients can now see the Verified badge on your profile and contact you through the directory.'),
            ],
            'details' => [
                __('Status') => $this->status->label(),
                __('Verified on') => ($profile?->verified_at ?? now())->translatedFormat('j F Y'),
                __('Profile') => $profile?->slug ? route('lawyers.show', $profile) : null,
            ],
            'action_label' => __('View my public profile'),
            'action_url' => $content['url'],
            'notice' => __('Keep your practice areas, consultation fee and availability up to date so clients can book the right slot.'),
            'outro' => [__('Thank you for helping us keep the directory trustworthy.')],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return [
            'status' => $this->status->label(),
            'note' => $this->note,
            'profile' => $this->profile?->slug ? route('lawyers.show', $this->profile) : null,
            'date' => ($this->profile?->verified_at ?? now())->translatedFormat('j F Y'),
        ];
    }
}
