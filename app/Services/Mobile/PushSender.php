<?php

namespace App\Services\Mobile;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sends a mobile push to a user's registered device (docs/Modules/Notifications.md, Push).
 *  - Raw FCM registration tokens (Android builds) go through Firebase Cloud Messaging HTTP v1,
 *    authenticated with the service account saved in Admin, Settings, Mobile app.
 *  - Expo push tokens (ExponentPushToken[...], iOS and Android) go through the Expo push service.
 * Both are free. A token the provider reports as unregistered is cleared from the user.
 */
class PushSender
{
    private const FcmScope = 'https://www.googleapis.com/auth/firebase.messaging';

    private const ExpoEndpoint = 'https://exp.host/--/api/v2/push/send';

    public static function isExpoToken(string $token): bool
    {
        return str_starts_with($token, 'ExponentPushToken[') || str_starts_with($token, 'ExpoPushToken[');
    }

    /** @param  array<string, scalar|null>  $data */
    public function send(User $user, string $title, string $body, array $data = []): void
    {
        $token = (string) $user->fcm_token;
        if ($token === '') {
            return;
        }

        $data = array_map(fn ($value) => (string) $value, array_filter($data, fn ($value) => $value !== null));
        $unregistered = self::isExpoToken($token)
            ? $this->sendViaExpo($token, $title, $body, $data)
            : $this->sendViaFcm($token, $title, $body, $data);

        if ($unregistered) {
            $user->forceFill(['fcm_token' => null, 'fcm_platform' => null, 'fcm_token_updated_at' => null])->saveQuietly();
        }
    }

    /**
     * @param  array<string, string>  $data
     * @return bool true when the token is no longer valid
     */
    private function sendViaFcm(string $token, string $title, string $body, array $data): bool
    {
        $project = (string) Setting::get('fcm_project_id');
        $response = Http::withToken($this->fcmAccessToken())->timeout(10)
            ->post("https://fcm.googleapis.com/v1/projects/{$project}/messages:send", ['message' => [
                'token' => $token,
                'notification' => ['title' => $title, 'body' => $body],
                'data' => $data,
                'android' => ['priority' => 'high', 'notification' => ['channel_id' => 'default', 'sound' => 'default']],
                'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
            ]]);

        if ($response->successful()) {
            return false;
        }

        $code = (string) data_get($response->json(), 'error.details.0.errorCode', data_get($response->json(), 'error.status'));
        if ($response->status() === 404 || $code === 'UNREGISTERED') {
            return true;
        }

        throw new RuntimeException('FCM push failed: '.$response->status().' '.$code);
    }

    /**
     * @param  array<string, string>  $data
     * @return bool true when the token is no longer valid
     */
    private function sendViaExpo(string $token, string $title, string $body, array $data): bool
    {
        $response = Http::acceptJson()->timeout(10)->post(self::ExpoEndpoint, [
            'to' => $token, 'title' => $title, 'body' => $body, 'data' => $data, 'sound' => 'default', 'channelId' => 'default', 'priority' => 'high',
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Expo push failed: '.$response->status());
        }

        return data_get($response->json(), 'data.status') === 'error'
            && data_get($response->json(), 'data.details.error') === 'DeviceNotRegistered';
    }

    /** OAuth2 access token for FCM from the service account (JWT bearer grant), cached ~55 minutes. */
    private function fcmAccessToken(): string
    {
        return Cache::remember('fcm-access-token', now()->addMinutes(55), function (): string {
            $account = json_decode((string) Setting::getSecret('fcm_credentials_json'), true);
            if (! is_array($account) || empty($account['client_email']) || empty($account['private_key'])) {
                throw new RuntimeException('FCM service account JSON is missing or invalid.');
            }

            $tokenUri = $account['token_uri'] ?? 'https://oauth2.googleapis.com/token';
            $encode = fn (string $value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
            $now = time();
            $unsigned = $encode((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT'])).'.'.$encode((string) json_encode([
                'iss' => $account['client_email'], 'scope' => self::FcmScope, 'aud' => $tokenUri, 'iat' => $now, 'exp' => $now + 3600,
            ]));

            if (! openssl_sign($unsigned, $signature, $account['private_key'], OPENSSL_ALGO_SHA256)) {
                throw new RuntimeException('Could not sign the FCM token request.');
            }

            $response = Http::asForm()->timeout(10)->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $unsigned.'.'.$encode($signature),
            ])->throw();

            return (string) $response->json('access_token');
        });
    }
}
