<?php

namespace App\Notifications;

use App\Enums\SupportMessageKind;
use App\Models\ContactMessage;
use App\Models\Setting;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Acknowledges a contact or feedback message to whoever sent it. Sent on demand to
 * the address they typed (they may not have an account): email always, WhatsApp
 * only when they gave a number and ticked consent. WhatsApp needs the
 * feedback_received / contact_received templates approved in Meta first;
 * until then the delivery is recorded as skipped, never as sent.
 */
class SupportMessageReceived extends PlatformNotification
{
    public function __construct(public ContactMessage $message) {}

    public function event(): string
    {
        return $this->message->kind === SupportMessageKind::Feedback ? 'feedback_received' : 'contact_received';
    }

    /**
     * @return list<string|class-string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['mail'];

        if ($notifiable instanceof AnonymousNotifiable && $notifiable->routeNotificationFor('whatsapp')) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    private function siteName(): string
    {
        return Setting::get('site_name') ?: (string) config('app.name');
    }

    /** @return array{title: string, body: string, url?: string|null} */
    public function content(object $notifiable): array
    {
        $replace = ['site' => $this->siteName(), 'reference' => $this->message->reference];

        return $this->message->kind === SupportMessageKind::Feedback
            ? [
                'title' => __('We have received your feedback (:reference)', $replace),
                'body' => __('Thank you for your feedback to :site. We have received it and will try to resolve it on an urgent basis. Your reference is :reference.', $replace),
            ]
            : [
                'title' => __('Thanks for contacting :site', $replace),
                'body' => __('Thanks for contacting us. We have received your message and will reply as soon as possible. Your reference is :reference.', $replace),
            ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $content = $this->content($notifiable);

        return (new MailMessage)
            ->subject($content['title'])
            ->greeting(__('Dear :name,', ['name' => $this->message->name]))
            ->line($content['body'])
            ->line(__('Your message: “:subject”', ['subject' => $this->message->subject]))
            ->line(__('Please do not share passwords or confidential case documents by email.'))
            ->salutation(__('Regards,').' '.$this->siteName());
    }

    public function whatsAppTemplate(object $notifiable): ?array
    {
        return [
            'key' => $this->event(),
            'locale' => $this->message->locale,
            'variables' => [$this->message->name, $this->siteName(), (string) $this->message->reference],
            'subject' => $this->message,
            'dedupe' => 'wa:'.$this->event().':'.$this->message->id,
        ];
    }
}
