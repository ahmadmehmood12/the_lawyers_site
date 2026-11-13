<?php

namespace App\Notifications;

use App\Enums\AccountType;
use App\Models\User;

/** Sent once the email address is verified (Illuminate\Auth\Events\Verified). */
class Welcome extends AccountNotification
{
    public function event(): string
    {
        return 'welcome';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $site = self::siteName();
        $client = $notifiable instanceof User && $notifiable->account_type === AccountType::Client;

        return [
            'title' => __('Welcome to :site', ['site' => $site]),
            'body' => $client
                ? __('Your account is ready. Find a verified lawyer, book a consultation and follow your case, documents and invoices in one place.')
                : __('Your workspace is ready. Add your first case, keep the court diary and let clients follow their next date.'),
            'url' => $client ? route('portal.dashboard') : route('dashboard'),
            'icon' => 'sparkles',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);
        $client = $notifiable instanceof User && $notifiable->account_type === AccountType::Client;

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => $client ? [
                __('Step 1') => __('Find a lawyer by city, court or practice area'),
                __('Step 2') => __('Book a consultation online or at the chamber'),
                __('Step 3') => __('Follow hearings, documents and invoices in your portal'),
            ] : [
                __('Step 1') => __('Complete your public profile and photo'),
                __('Step 2') => __('Upload your Bar card to get the Verified badge'),
                __('Step 3') => __('Add your first case and its next hearing'),
            ],
            'action_label' => $client ? __('Open my portal') : __('Open my dashboard'),
            'action_url' => $content['url'],
            'outro' => [__('The User Guide explains every feature step by step: :url', ['url' => route('guide')])],
        ];
    }
}
