<?php

namespace App\Notifications;

use App\Services\Auth\OneTimeCodeService;

/**
 * Six-digit code email for email verification or password reset. Sent at once
 * (sync connection) so the code arrives while the user waits on the form.
 */
class OneTimeCode extends PlatformNotification
{
    public int $tries = 1;

    public function __construct(public string $code, public string $purpose)
    {
        $this->onConnection('sync');
    }

    public function event(): string
    {
        return $this->purpose === OneTimeCodeService::ResetPassword ? 'password_reset_code' : 'email_verification_code';
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /** @return array{title: string, body: string} */
    public function content(object $notifiable): array
    {
        $replace = ['site' => self::siteName(), 'minutes' => OneTimeCodeService::MinutesValid];

        return $this->purpose === OneTimeCodeService::ResetPassword
            ? ['title' => __('Your :site password reset code', $replace), 'body' => __('Use this code to reset your password. It expires in :minutes minutes.', $replace)]
            : ['title' => __('Your :site verification code', $replace), 'body' => __('Use this code to verify your email address. It expires in :minutes minutes.', $replace)];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'],
            'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'code' => $this->code,
            'notice' => __('Never share this code with anyone. Our team will never ask you for it. If you did not request it, you can ignore this email.'),
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['code' => $this->code, 'minutes' => OneTimeCodeService::MinutesValid];
    }
}
