<?php

namespace App\Notifications;

use App\Models\Client;
use App\Models\User;

/**
 * Invites a client to the portal. A new account gets a signed link to choose a password; an
 * existing client account just gets a sign in link (Workspace\ClientController::invitePortal).
 */
class ClientPortalInvitation extends AccountNotification
{
    public function __construct(public Client $client, public string $url, public bool $newAccount, public string $invitedBy) {}

    public function event(): string
    {
        return 'portal_invitation';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $firm = $this->client->organization->name;

        return [
            'title' => __(':firm invited you to your case portal', ['firm' => $firm]),
            'body' => __(':lawyer from :firm invited you to follow your case online: next hearing dates, shared documents, invoices and messages.', ['lawyer' => $this->invitedBy, 'firm' => $firm]),
            'url' => $this->url,
            'icon' => 'user',
        ];
    }

    /** New accounts do not have a bell yet; only the email is sent. */
    public function via(object $notifiable): array
    {
        return $this->newAccount ? ['mail'] : parent::via($notifiable);
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->client->name]),
            'intro' => [$content['body'], $this->newAccount ? __('Press the button to choose your password. The link works for 7 days.') : __('Sign in with your existing account to see it.')],
            'details' => [__('Law firm') => $this->client->organization->name, __('Invited by') => $this->invitedBy, __('Your email') => $this->client->email],
            'notice' => __('If you were not expecting this, you can ignore this email.'),
            'action_label' => $this->newAccount ? __('Set my password') : __('Open my portal'),
            'action_url' => $this->url,
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['firm' => $this->client->organization->name, 'lawyer' => $this->invitedBy];
    }

    protected function recipientName(object $notifiable): string
    {
        return $notifiable instanceof User ? $notifiable->name : $this->client->name;
    }
}
