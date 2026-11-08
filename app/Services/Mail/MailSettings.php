<?php

namespace App\Services\Mail;

use App\Models\Setting;

/**
 * Applies SMTP/mail settings saved in Admin → Settings at runtime.
 * Secrets are stored encrypted by Setting::putSecret(); empty values keep
 * the server environment configuration as the fallback.
 */
class MailSettings
{
    /** @var array<string, string> */
    public const FIELDS = [
        'mail_mailer' => 'mail.default',
        'mail_scheme' => 'mail.mailers.smtp.scheme',
        'mail_host' => 'mail.mailers.smtp.host',
        'mail_port' => 'mail.mailers.smtp.port',
        'mail_username' => 'mail.mailers.smtp.username',
        'mail_from_address' => 'mail.from.address',
        'mail_from_name' => 'mail.from.name',
    ];

    public function apply(): void
    {
        $mailer = Setting::get('mail_mailer');

        if (blank($mailer)) {
            return;
        }

        config(['mail.default' => $mailer]);

        foreach (self::FIELDS as $key => $configKey) {
            if ($key === 'mail_mailer') {
                continue;
            }

            $value = Setting::get($key);

            if (filled($value)) {
                config([$configKey => $key === 'mail_port' ? (int) $value : $value]);
            }
        }

        $password = Setting::getSecret('mail_password');

        if (filled($password)) {
            config(['mail.mailers.smtp.password' => $password]);
        }
    }

    /** @return array<string, mixed> */
    public function values(): array
    {
        return [
            'mailer' => Setting::get('mail_mailer') ?: config('mail.default'),
            'scheme' => Setting::get('mail_scheme') ?? config('mail.mailers.smtp.scheme'),
            'host' => Setting::get('mail_host') ?: config('mail.mailers.smtp.host'),
            'port' => (string) (Setting::get('mail_port') ?: config('mail.mailers.smtp.port')),
            'username' => Setting::get('mail_username') ?: config('mail.mailers.smtp.username'),
            'from_address' => Setting::get('mail_from_address') ?: config('mail.from.address'),
            'from_name' => Setting::get('mail_from_name') ?: config('mail.from.name'),
            'has_password' => Setting::hasSecret('mail_password'),
            'password' => null,
        ];
    }
}
