<?php

namespace App\Mail;

use App\Models\OrganizationInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrganizationInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public OrganizationInvitation $invitation, public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('You have been invited to join :name', ['name' => $this->invitation->organization->name]));
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.invitation', with: [
            'organization' => $this->invitation->organization->name,
            'role' => $this->invitation->role->label(),
            'url' => route('invitations.show', $this->token),
            'expires' => $this->invitation->expires_at->toDateString(),
        ]);
    }
}
