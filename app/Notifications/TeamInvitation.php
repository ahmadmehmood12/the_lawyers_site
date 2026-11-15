<?php

namespace App\Notifications;

use App\Models\OrganizationInvitation;
use App\Models\User;

/**
 * Invites an advocate or staff member to join a firm (Workspace\TeamController::invite). Uses the
 * branded notification email like every other message; someone who already has an account also
 * sees it in the bell. The raw token only lives in the link, the database keeps its hash.
 */
class TeamInvitation extends AccountNotification
{
    public function __construct(public OrganizationInvitation $invitation, public string $token) {}

    public function event(): string
    {
        return 'team_invitation';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $firm = $this->invitation->organization->name;

        return [
            'title' => __('You are invited to join :firm', ['firm' => $firm]),
            'body' => __(':inviter invited you to join :firm on :site as :role.', [
                'inviter' => $this->invitation->inviter?->name ?? $firm,
                'firm' => $firm,
                'site' => self::siteName(),
                'role' => $this->invitation->role->label(),
            ]),
            'url' => route('invitations.show', $this->token),
            'icon' => 'users',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [
                $content['body'],
                $notifiable instanceof User
                    ? __('Press the button and sign in with this email to accept. The firm’s cases, diary and clients you are given access to will appear in your workspace.')
                    : __('Press the button to create your free account with this email address, then accept the invitation.'),
            ],
            'details' => [
                __('Law firm') => $this->invitation->organization->name,
                __('Your role') => $this->invitation->role->label(),
                __('Invited by') => $this->invitation->inviter?->name,
                __('Invitation for') => $this->invitation->email,
                __('Valid until') => $this->invitation->expires_at->translatedFormat('j F Y'),
            ],
            'notice' => __('If you were not expecting this invitation, you can ignore this email. Nothing changes until you accept.'),
            'action_label' => __('View invitation'),
            'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return [
            'firm' => $this->invitation->organization->name,
            'role' => $this->invitation->role->label(),
            'inviter' => $this->invitation->inviter?->name,
            'date' => $this->invitation->expires_at->translatedFormat('j F Y'),
        ];
    }

    protected function recipientName(object $notifiable): string
    {
        return $notifiable instanceof User ? $notifiable->name : __('Sir/Madam');
    }
}
