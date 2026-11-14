<?php

namespace App\Notifications;

use App\Enums\NotificationChannel;
use App\Models\EmailTemplate;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use App\Support\PublicFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Base for all user notifications (docs/Modules/Notifications.md).
 *  - Always queued; never blocks a request.
 *  - Channels are filtered by the user's notification_preferences per event
 *    (in-app and email default ON; WhatsApp requires an explicit opt-in row).
 *  - Rendered in the recipient's locale (User implements preferredLocale()).
 */
abstract class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** Preference event key, e.g. hearing_reminder. */
    abstract public function event(): string;

    /** @return array{title: string, body: string, url?: string|null, icon?: string} */
    abstract public function content(object $notifiable): array;

    /** WhatsApp template key + ordered variables, or null if not sent on WhatsApp. */
    public function whatsAppTemplate(object $notifiable): ?array
    {
        return null;
    }

    /**
     * @return list<string|class-string>
     */
    public function via(object $notifiable): array
    {
        if ($notifiable instanceof AnonymousNotifiable) {
            // On-demand recipients (clients without a portal account): the caller only adds a
            // whatsapp route when consent is recorded, so each route present is a channel to use.
            return array_values(array_filter([
                $notifiable->routeNotificationFor('mail') ? 'mail' : null,
                $notifiable->routeNotificationFor('whatsapp') && $this->whatsAppTemplate($notifiable) ? WhatsAppChannel::class : null,
            ]));
        }

        if (! $notifiable instanceof User) {
            return ['mail'];
        }

        $preferences = $notifiable->notificationPreferences()->where('event', $this->event())->pluck('enabled', 'channel');
        $enabled = fn (NotificationChannel $c, bool $default) => (bool) ($preferences[$c->value] ?? $default);
        $channels = [];

        if ($enabled(NotificationChannel::InApp, true)) {
            $channels[] = 'database';
        }

        if ($enabled(NotificationChannel::Email, true) && $notifiable->email) {
            $channels[] = 'mail';
        }

        if ($notifiable->hasWhatsAppConsent() && $enabled(NotificationChannel::WhatsApp, false) && $notifiable->phone && $this->whatsAppTemplate($notifiable)) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [...$this->content($notifiable), 'event' => $this->event()];
    }

    /**
     * Branded email (resources/views/mail/notification.blade.php). Subclasses override
     * mailData() to add a details table, notice and action; admins can override subject,
     * heading, intro and outro per event in Admin, Email templates (EmailTemplate).
     */
    public function toMail(object $notifiable): MailMessage
    {
        $data = [
            'greeting' => null, 'code' => null, 'intro' => [], 'details' => [], 'action_label' => __('Open'), 'action_url' => null, 'notice' => null, 'outro' => [],
            ...$this->mailData($notifiable),
        ];
        $replace = [':name' => $this->recipientName($notifiable), ':site' => self::siteName(), ...collect($this->mailReplacements($notifiable))->mapWithKeys(fn ($v, $k) => [':'.$k => (string) $v])->all()];
        $language = $this->locale ?? app()->getLocale();
        $template = EmailTemplate::query()->where('key', $this->mailTemplateKey())->whereIn('language', [$language, 'en'])->where('is_active', true)
            ->orderByRaw('language = ? DESC', [$language])->first();

        if ($template) {
            $data['subject'] = strtr($template->subject, $replace);
            $data['heading'] = $template->heading ? strtr($template->heading, $replace) : $data['heading'];
            $data['intro'] = $template->intro ? array_values(array_filter(explode("\n", strtr($template->intro, $replace)))) : $data['intro'];
            $data['outro'] = $template->outro ? array_values(array_filter(explode("\n", strtr($template->outro, $replace)))) : $data['outro'];
        }

        return (new MailMessage)
            ->subject($data['subject'])
            ->view(['html' => 'mail.notification', 'text' => 'mail.notification-text'], [
                ...$data,
                'site' => self::siteName(),
                'logo' => PublicFile::url(Setting::get('site_logo_path')),
                'rtl' => $language === 'ur',
            ]);
    }

    /**
     * Email content. Default: built from content(); override for a richer email.
     *
     * @return array{subject: string, heading: string, greeting?: string|null, intro?: list<string>, details?: array<string, string|null>, action_label?: string, action_url?: string|null, notice?: string|null, outro?: list<string>}
     */
    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'action_url' => $notifiable instanceof AnonymousNotifiable ? null : ($content['url'] ?? null),
        ];
    }

    /** Key for an admin-editable EmailTemplate (defaults to the preference event). */
    public function mailTemplateKey(): string
    {
        return $this->event();
    }

    /**
     * Extra :placeholders available to admin-edited templates.
     *
     * @return array<string, string|int|null>
     */
    public function mailReplacements(object $notifiable): array
    {
        return [];
    }

    protected function recipientName(object $notifiable): string
    {
        if ($notifiable instanceof AnonymousNotifiable) {
            $mail = $notifiable->routeNotificationFor('mail');

            return is_array($mail) ? (string) (array_values($mail)[0] ?? __('Sir/Madam')) : __('Sir/Madam');
        }

        return (string) ($notifiable->name ?? __('Sir/Madam'));
    }

    public static function siteName(): string
    {
        return Setting::get('site_name') ?: (string) config('app.name');
    }
}
