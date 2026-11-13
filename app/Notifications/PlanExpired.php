<?php

namespace App\Notifications;

use App\Models\Subscription;

/** A paid plan or trial has ended (subscriptions:expire). */
class PlanExpired extends AccountNotification
{
    public function __construct(public Subscription $subscription) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'plan_expired';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return [
            'title' => __('Your :plan plan has ended', ['plan' => $this->subscription->plan->name]),
            'body' => __('Your account is now on the free plan. Everything you added is still there. Renew to add more cases, clients and team members again.'),
            'url' => route('billing.index', ['plan' => $this->subscription->plan->slug]),
            'icon' => 'alert',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => [
                __('Plan') => $this->subscription->plan->name,
                __('Ended on') => $this->subscription->ends_at?->translatedFormat('j F Y'),
                __('Organization') => $this->subscription->organization->name,
            ],
            'action_label' => __('Renew my plan'), 'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['plan' => $this->subscription->plan->name];
    }
}
