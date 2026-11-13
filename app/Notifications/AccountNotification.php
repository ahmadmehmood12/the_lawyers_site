<?php

namespace App\Notifications;

use App\Models\User;

/**
 * Base for account and billing emails that must always arrive (welcome, plan and payment
 * changes, portal invitations): email plus the in-app bell, ignoring per event preferences.
 */
abstract class AccountNotification extends PlatformNotification
{
    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return $notifiable instanceof User ? ['database', 'mail'] : ['mail'];
    }

    protected static function money(float|string|null $amount): string
    {
        return 'Rs '.number_format((float) $amount);
    }
}
