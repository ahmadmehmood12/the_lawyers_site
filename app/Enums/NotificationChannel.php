<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum NotificationChannel: string
{
    use HasOptions;

    case InApp = 'in_app';
    case Email = 'email';
    case WhatsApp = 'whatsapp';
    case Sms = 'sms';

    public static function translationGroup(): string
    {
        return 'notification_channel';
    }
}
