<?php

namespace App\Notifications;

use App\Models\Payment;

class PaymentReceived extends PlatformNotification
{
    public function __construct(public Payment $payment) {}

    public function event(): string
    {
        return 'payment';
    }

    public function content(object $notifiable): array
    {
        return [
            'title' => __('Payment received — receipt :number', ['number' => $this->payment->receipt_number]),
            'body' => __('Thank you. We have received PKR :amount.', ['amount' => number_format((float) $this->payment->amount)]),
            'url' => route('portal.invoices.show', $this->payment->invoice_id),
            'icon' => 'receipt',
        ];
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        return [
            'key' => 'payment_received',
            'variables' => [$notifiable->name ?? '', 'PKR '.number_format((float) $this->payment->amount), $this->payment->receipt_number],
            'subject' => $this->payment,
            'organization_id' => $this->payment->organization_id,
            'dedupe' => 'wa:payment:'.$this->payment->id,
        ];
    }
}
