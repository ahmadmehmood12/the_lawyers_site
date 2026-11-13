<?php

namespace App\Notifications;

use App\Models\Subscription;

/** Sent a few days before a free trial ends (subscriptions:remind). */
class TrialEnding extends AccountNotification
{
    public function __construct(public Subscription $subscription) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'trial_ending';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $date = $this->subscription->trial_ends_at?->translatedFormat('j F Y');

        return [
            'title' => __('Your free trial ends on :date', ['date' => $date]),
            'body' => __('Your :plan trial ends on :date. Choose a plan to keep its features. Nothing you have added is ever deleted.', ['plan' => $this->subscription->plan->name, 'date' => $date]),
            'url' => route('billing.index', ['plan' => $this->subscription->plan->slug]),
            'icon' => 'clock',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);
        $plan = $this->subscription->plan;

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => [
                __('Plan') => $plan->name,
                __('Trial ends') => $this->subscription->trial_ends_at?->translatedFormat('j F Y'),
                __('Monthly price') => self::money($plan->price_monthly),
                __('Yearly price') => $plan->price_yearly > 0 ? self::money($plan->price_yearly) : null,
            ],
            'notice' => __('If you do nothing, your account moves to the free plan. Your cases and files stay safe; only adding more beyond the free limits pauses.'),
            'action_label' => __('Choose a plan'), 'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['plan' => $this->subscription->plan->name, 'date' => $this->subscription->trial_ends_at?->translatedFormat('j F Y')];
    }
}
