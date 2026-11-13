<?php

namespace App\Notifications;

use App\Models\PlanPayment;
use App\Models\Subscription;

/** A paid plan is now active (payment confirmed by Stripe or by the finance team). */
class PlanActivated extends AccountNotification
{
    public function __construct(public Subscription $subscription, public ?PlanPayment $payment = null) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'plan_activated';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $plan = $this->subscription->plan->name;
        $until = $this->subscription->ends_at?->translatedFormat('j F Y');

        return [
            'title' => __('Your :plan plan is active', ['plan' => $plan]),
            'body' => $until
                ? __('Your payment is confirmed and the :plan plan is active until :date. All its limits and features are now switched on.', ['plan' => $plan, 'date' => $until])
                : __('The :plan plan is active. All its limits and features are now switched on.', ['plan' => $plan]),
            'url' => route('billing.index'),
            'icon' => 'crown',
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
                __('Billing') => $this->subscription->billing_cycle === 'yearly' ? __('Yearly') : __('Monthly'),
                __('Amount paid') => $this->payment ? self::money($this->payment->amount) : null,
                __('Active until') => $this->subscription->ends_at?->translatedFormat('j F Y'),
                __('Organization') => $this->subscription->organization->name,
            ],
            'action_label' => __('Open my dashboard'), 'action_url' => route('dashboard'),
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['plan' => $this->subscription->plan->name, 'date' => $this->subscription->ends_at?->translatedFormat('j F Y')];
    }
}
