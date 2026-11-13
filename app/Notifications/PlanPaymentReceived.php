<?php

namespace App\Notifications;

use App\Models\PlanPayment;

/** A plan payment was submitted (bank transfer etc.) and is waiting for verification. */
class PlanPaymentReceived extends AccountNotification
{
    public function __construct(public PlanPayment $payment) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'plan_payment_received';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return [
            'title' => __('We received your payment for :plan', ['plan' => $this->payment->plan->name]),
            'body' => __('Thank you. We are checking your payment of :amount and will switch on your plan as soon as it is confirmed, usually within one working day.', ['amount' => self::money($this->payment->amount)]),
            'url' => route('billing.index'),
            'icon' => 'wallet',
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
                __('Plan') => $this->payment->plan->name,
                __('Billing') => $this->payment->billing_cycle === 'yearly' ? __('Yearly') : __('Monthly'),
                __('Amount') => self::money($this->payment->amount),
                __('Method') => $this->payment->method?->name,
                __('Reference') => $this->payment->reference,
            ],
            'action_label' => __('View billing'), 'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['plan' => $this->payment->plan->name, 'amount' => self::money($this->payment->amount)];
    }
}
