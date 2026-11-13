<?php

namespace App\Notifications;

use App\Models\PlanPayment;

/** The finance team could not confirm a submitted plan payment. */
class PlanPaymentRejected extends AccountNotification
{
    public function __construct(public PlanPayment $payment, public string $reason) {}

    public function event(): string
    {
        return 'billing';
    }

    public function mailTemplateKey(): string
    {
        return 'plan_payment_rejected';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return [
            'title' => __('We could not confirm your payment'),
            'body' => __('Your payment for the :plan plan could not be confirmed: :reason', ['plan' => $this->payment->plan->name, 'reason' => $this->reason]),
            'url' => route('billing.index'),
            'icon' => 'alert',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body'], __('You can submit the payment again from Billing, or reply to this email if you think this is a mistake.')],
            'details' => [__('Plan') => $this->payment->plan->name, __('Amount') => self::money($this->payment->amount), __('Reference') => $this->payment->reference],
            'action_label' => __('Open billing'), 'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['plan' => $this->payment->plan->name, 'reason' => $this->reason];
    }
}
