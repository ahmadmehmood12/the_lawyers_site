<?php

namespace App\Notifications;

use App\Enums\VerificationStatus;

class VerificationStatusChanged extends PlatformNotification
{
    public function __construct(public VerificationStatus $status, public ?string $note = null) {}

    public function event(): string
    {
        return 'case_update';
    }

    public function content(object $notifiable): array
    {
        return [
            'title' => __('Verification update: :status', ['status' => $this->status->label()]),
            'body' => $this->note ?: __('Your lawyer verification status is now “:status”.', ['status' => $this->status->label()]),
            'url' => route('lawyer.verification.show'),
            'icon' => 'shield',
        ];
    }
}
