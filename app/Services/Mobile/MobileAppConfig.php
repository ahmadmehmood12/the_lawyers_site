<?php

namespace App\Services\Mobile;

use App\Models\Setting;
use App\Support\PublicFile;

/**
 * Platform-wide configuration for the companion mobile apps (iOS/Android),
 * stored as admin settings. Read by the admin Settings page, by the public
 * app-config API the apps poll on launch, and by the push-notification sender.
 *
 * Secrets (the FCM service-account JSON) are stored encrypted and never
 * returned to the browser or the public API.
 */
class MobileAppConfig
{
    /** Non-secret settings surfaced to the admin form. */
    public const KEYS = [
        'mobile_app_name', 'push_enabled', 'fcm_project_id',
        'ios_app_version', 'ios_min_version', 'ios_app_url',
        'android_app_version', 'android_min_version', 'android_app_url',
        'app_force_update', 'app_maintenance', 'app_maintenance_message',
    ];

    /** Push can be sent only when enabled AND the FCM credentials are present. */
    public function pushReady(): bool
    {
        return Setting::get('push_enabled', '0') === '1'
            && filled(Setting::get('fcm_project_id'))
            && Setting::hasSecret('fcm_credentials_json');
    }

    /**
     * Whether a push can be sent to this device token: Expo tokens need only the admin switch,
     * raw FCM tokens also need the FCM project + service account.
     */
    public function canPush(string $token): bool
    {
        if (Setting::get('push_enabled', '0') !== '1') {
            return false;
        }

        return PushSender::isExpoToken($token) || $this->pushReady();
    }

    public function appName(): string
    {
        return (string) (Setting::get('mobile_app_name') ?: (Setting::get('site_name') ?: config('app.name')));
    }

    public function iconUrl(): ?string
    {
        return PublicFile::url(Setting::get('mobile_app_icon_path'));
    }

    /**
     * Public configuration the mobile apps fetch on launch (no secrets).
     *
     * @return array<string, mixed>
     */
    public function publicPayload(): array
    {
        return [
            'app_name' => $this->appName(),
            'icon_url' => $this->iconUrl(),
            'push_enabled' => Setting::get('push_enabled', '0') === '1',
            'force_update' => Setting::get('app_force_update', '0') === '1',
            'maintenance' => Setting::get('app_maintenance', '0') === '1',
            'maintenance_message' => Setting::get('app_maintenance_message') ?: null,
            'ios' => [
                'version' => Setting::get('ios_app_version') ?: null,
                'min_version' => Setting::get('ios_min_version') ?: null,
                'url' => Setting::get('ios_app_url') ?: null,
            ],
            'android' => [
                'version' => Setting::get('android_app_version') ?: null,
                'min_version' => Setting::get('android_min_version') ?: null,
                'url' => Setting::get('android_app_url') ?: null,
            ],
        ];
    }

    /**
     * Settings for the admin form. The service-account JSON is reported only
     * as present or absent, never echoed back.
     *
     * @return array<string, mixed>
     */
    public function adminPayload(): array
    {
        return [
            'app_name' => (string) (Setting::get('mobile_app_name') ?: ''),
            'icon_url' => $this->iconUrl(),
            'push_enabled' => Setting::get('push_enabled', '0') === '1',
            'push_ready' => $this->pushReady(),
            'fcm_project_id' => (string) (Setting::get('fcm_project_id') ?: ''),
            'has_fcm_credentials' => Setting::hasSecret('fcm_credentials_json'),
            'ios_app_version' => (string) (Setting::get('ios_app_version') ?: ''),
            'ios_min_version' => (string) (Setting::get('ios_min_version') ?: ''),
            'ios_app_url' => (string) (Setting::get('ios_app_url') ?: ''),
            'android_app_version' => (string) (Setting::get('android_app_version') ?: ''),
            'android_min_version' => (string) (Setting::get('android_min_version') ?: ''),
            'android_app_url' => (string) (Setting::get('android_app_url') ?: ''),
            'force_update' => Setting::get('app_force_update', '0') === '1',
            'maintenance' => Setting::get('app_maintenance', '0') === '1',
            'maintenance_message' => (string) (Setting::get('app_maintenance_message') ?: ''),
        ];
    }
}
