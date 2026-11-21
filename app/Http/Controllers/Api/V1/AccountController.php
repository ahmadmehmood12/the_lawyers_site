<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\NotificationChannel;
use App\Http\Controllers\Account\NotificationController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Actions\ConfirmTwoFactorAuthentication;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Actions\GenerateNewRecoveryCodes;
use Laravel\Fortify\Contracts\UpdatesUserPasswords;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;
use Laravel\Fortify\Fortify;

/**
 * Profile, password, two-factor setup and notifications for the signed-in user. Calls the same
 * Fortify actions and NotificationController helpers as the web account pages.
 * Swagger: app/Swagger/AccountControllerDocs.php.
 */
class AccountController extends ApiController
{
    public function updateProfile(Request $request, UpdatesUserProfileInformation $updater): JsonResponse
    {
        $user = $request->user();
        // Fields left out keep their current value; the action validates and re-verifies a changed email.
        $updater->update($user, [
            'name' => $request->input('name', $user->name),
            'email' => $request->input('email', $user->email),
            'phone' => $request->exists('phone') ? $request->input('phone') : $user->phone,
            'locale' => $request->input('locale', $user->locale),
        ]);

        return $this->success(AuthController::userPayload($user->refresh()), __('Profile saved.'));
    }

    public function updatePassword(Request $request, UpdatesUserPasswords $updater): JsonResponse
    {
        // UpdateUserPassword checks current_password on the web guard; point it at this user for the request.
        Auth::guard('web')->setUser($request->user());
        $updater->update($request->user(), $request->all());

        return $this->success(null, __('Password updated.'));
    }

    public function twoFactor(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([
            'enabled' => $user->two_factor_confirmed_at !== null,
            'pending_confirmation' => $user->two_factor_secret !== null && $user->two_factor_confirmed_at === null,
        ]);
    }

    /** Step 1: create a secret (password required, like the web's confirm-password step). */
    public function enableTwoFactor(Request $request, EnableTwoFactorAuthentication $enable): JsonResponse
    {
        $this->confirmPassword($request);
        $user = $request->user();
        $enable($user, $request->boolean('force'));
        $user->refresh();

        return $this->success([
            'secret' => Fortify::currentEncrypter()->decrypt($user->two_factor_secret),
            'otpauth_url' => $user->twoFactorQrCodeUrl(),
            'qr_svg' => $user->twoFactorQrCodeSvg(),
        ], __('Scan the QR code or enter the key in your authenticator app, then confirm with a code.'));
    }

    /** Step 2: confirm with a code from the authenticator app; returns the recovery codes once. */
    public function confirmTwoFactor(Request $request, ConfirmTwoFactorAuthentication $confirm): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);
        $confirm($request->user(), $request->string('code')->toString());

        return $this->success(['recovery_codes' => $request->user()->refresh()->recoveryCodes()], __('Two-factor authentication is on.'));
    }

    public function recoveryCodes(Request $request): JsonResponse
    {
        $this->confirmPassword($request);

        return $this->success(['recovery_codes' => $request->user()->two_factor_secret ? $request->user()->recoveryCodes() : []]);
    }

    public function regenerateRecoveryCodes(Request $request, GenerateNewRecoveryCodes $generate): JsonResponse
    {
        $this->confirmPassword($request);
        $generate($request->user());

        return $this->success(['recovery_codes' => $request->user()->refresh()->recoveryCodes()], __('New recovery codes generated.'));
    }

    public function disableTwoFactor(Request $request, DisableTwoFactorAuthentication $disable): JsonResponse
    {
        $this->confirmPassword($request);
        $disable($request->user());

        return $this->success(null, __('Two-factor authentication is off.'));
    }

    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();
        $page = $user->notifications()->latest()->paginate(20)->through(fn ($n) => [
            'id' => $n->id,
            'data' => $n->data,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at->toIso8601String(),
        ]);

        return response()->json([
            'status' => 'Success',
            'timestamp' => now()->format('Y-m-d H:i:s'),
            'message' => 'OK',
            'data' => $page->items(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'unread' => $user->unreadNotifications()->count()],
        ]);
    }

    public function readNotification(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return $this->success(['unread' => $request->user()->unreadNotifications()->count()]);
    }

    public function readAllNotifications(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->success(['unread' => 0]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([
            'events' => NotificationController::EVENTS,
            'channels' => array_values(array_filter(NotificationChannel::options(), fn ($c) => $c['value'] !== NotificationChannel::Sms->value)),
            'defaults' => ['in_app' => true, 'email' => true, 'whatsapp' => false, 'push' => true],
            'preferences' => $user->notificationPreferences()->get(['event', 'channel', 'enabled']),
            'whatsapp_consent' => $user->hasWhatsAppConsent(),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        NotificationController::savePreferences($request->user(), $request->validate(NotificationController::preferenceRules())['preferences'] ?? []);

        return $this->preferences($request);
    }

    private function confirmPassword(Request $request): void
    {
        Auth::guard('web')->setUser($request->user());
        $request->validate(['password' => ['required', 'string', 'current_password:web']]);
    }
}
