<?php

namespace App\Notifications;

use App\Models\Subscription;

/** A workspace moves to another plan (for example a paid plan falling back to free). */
class PlanChanged extends AccountNotification
{
    public function __construct(public Subscription $subscription, public ?string $previousPlan = null) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'plan_changed';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        $plan = $this->subscription->plan->name;

        return [
            'title' => __('Your plan is now :plan', ['plan' => $plan]),
            'body' => $this->previousPlan
                ? __('Your workspace has moved from :previous to :plan. The new limits and features are active now.', ['previous' => $this->previousPlan, 'plan' => $plan])
                : __('Your workspace is now on the :plan plan. The new limits and features are active now.', ['plan' => $plan]),
            'url' => route('billing.index'),
            'icon' => 'crown',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);
        $plan = $this->subscription->plan;

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => [
                __('Plan') => $plan->name,
                __('Previous plan') => $this->previousPlan,
                __('Billing') => $this->subscription->billing_cycle === 'yearly' ? __('Yearly') : __('Monthly'),
                __('Monthly price') => self::money($plan->price_monthly),
                __('Active until') => $this->subscription->ends_at?->translatedFormat('j F Y'),
                __('Organization') => $this->subscription->organization->name,
            ],
            'action_label' => __('View my plan'),
            'action_url' => $content['url'],
            'notice' => __('Existing cases, clients and files are never removed when you change plan.'),
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return [
            'plan' => $this->subscription->plan->name,
            'previous_plan' => $this->previousPlan,
            'date' => $this->subscription->ends_at?->translatedFormat('j F Y'),
        ];
    }
}
