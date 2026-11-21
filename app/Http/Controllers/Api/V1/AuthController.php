<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Workspace\AppointmentController;
use App\Models\BarCouncil;
use App\Models\User;
use App\Services\Access\CurrentOrganization;
use App\Services\Access\OrganizationAccess;
use App\Services\Auth\OneTimeCodeService;
use App\Services\Messaging\MessagingService;
use App\Support\PublicFile;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\ResetsUserPasswords;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

/**
 * Mobile sign-in, sign-up, two-factor challenge, password reset and email verification.
 * Uses the same Fortify callbacks/actions and one-time code service as the web screens, so
 * suspended accounts, throttling, codes, welcome email and audit log behave identically.
 * Swagger: app/Swagger/AuthControllerDocs.php.
 */
class AuthController extends ApiController
{
    private const ChallengeMinutes = 10;

    public function __construct(private OneTimeCodeService $codes) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        // Same check as the web login (FortifyServiceProvider::authenticateUsing): password + active account.
        $user = (Fortify::$authenticateUsingCallback)($request);
        if (! $user) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return $this->success([
                'two_factor' => true,
                'challenge_token' => Crypt::encryptString((string) json_encode(['id' => $user->id, 'exp' => now()->addMinutes(self::ChallengeMinutes)->timestamp, 'device' => $request->input('device_name')])),
            ], __('Enter the code from your authenticator app.'));
        }

        return $this->issueToken($user, $request->input('device_name'));
    }

    public function twoFactorChallenge(Request $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['nullable', 'string', 'required_without:recovery_code'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        try {
            $challenge = json_decode(Crypt::decryptString($request->string('challenge_token')->toString()), true);
        } catch (DecryptException) {
            $challenge = null;
        }

        $user = is_array($challenge) && ($challenge['exp'] ?? 0) >= now()->timestamp ? User::find($challenge['id'] ?? 0) : null;
        if (! $user || ! $user->two_factor_secret || $user->isSuspended()) {
            throw ValidationException::withMessages(['challenge_token' => __('Your sign-in has expired. Please sign in again.')]);
        }

        if ($code = $request->input('code')) {
            $valid = $provider->verify(Fortify::currentEncrypter()->decrypt($user->two_factor_secret), (string) $code);
        } else {
            $recovery = collect($user->recoveryCodes())->first(fn (string $c) => hash_equals($c, (string) $request->input('recovery_code')));
            $valid = $recovery !== null;
            if ($valid) {
                $user->replaceRecoveryCode($recovery);
            }
        }

        if (! $valid) {
            throw ValidationException::withMessages([$code ? 'code' : 'recovery_code' => __('The provided two factor authentication code was invalid.')]);
        }

        return $this->issueToken($user, $challenge['device'] ?? null);
    }

    public function registrationOptions(): JsonResponse
    {
        return $this->success([
            'types' => ['client', 'lawyer', 'firm'],
            'bar_councils' => BarCouncil::query()->orderBy('name')->get(['id', 'name', 'name_ur'])
                ->map(fn (BarCouncil $c) => ['value' => $c->id, 'label' => app()->getLocale() === 'ur' && $c->name_ur ? $c->name_ur : $c->name]),
        ]);
    }

    /** Same action as the web sign-up (CreateNewUser); Registered sends the 6-digit verification code. */
    public function register(Request $request, CreateNewUser $creator): JsonResponse
    {
        $user = $creator->create($request->all());
        event(new Registered($user));

        return $this->issueToken($user, $request->input('device_name'), __('Account created. Enter the code we emailed you.'), 201);
    }

    /** Emails a 6-digit reset code (User::sendPasswordResetNotification), like the web form. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $email = strtolower($request->string('email')->toString());
        $status = Password::broker(config('fortify.passwords'))->sendResetLink(['email' => $email]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return $this->success(['email' => $email], __('Email sent to :email', ['email' => $email]));
    }

    public function verifyResetCode(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'digits:6']]);
        $token = $this->codes->resetTokenFor($data['email'], $data['code']);

        if (! $token) {
            throw ValidationException::withMessages(['code' => __('That code is wrong or has expired. Check the latest email or send a new code.')]);
        }

        return $this->success(['reset_token' => $token, 'email' => strtolower($data['email'])], __('Code verified. Choose a new password.'));
    }

    /** Same broker + ResetUserPassword action as the web; every mobile token is revoked afterwards. */
    public function resetPassword(Request $request, ResetsUserPasswords $resetter): JsonResponse
    {
        $request->validate(['token' => ['required', 'string'], 'email' => ['required', 'email'], 'password' => ['required', 'string']]);

        $status = Password::broker(config('fortify.passwords'))->reset(
            ['email' => strtolower($request->string('email')->toString()), ...$request->only('password', 'password_confirmation', 'token')],
            function (User $user) use ($request, $resetter): void {
                $resetter->reset($user, $request->all());
                $user->setRememberToken(Str::random(60));
                $user->save();
                $user->tokens()->delete();
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return $this->success(null, __($status));
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'digits:6']]);
        $user = $request->user();

        if (! $user->hasVerifiedEmail() && ! $this->codes->verifyUserEmail($user, $request->string('code')->toString())) {
            throw ValidationException::withMessages(['code' => __('That code is wrong or has expired. Check the latest email or send a new code.')]);
        }

        return $this->success(self::userPayload($user->refresh()), __('Your email address is verified.'));
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return $this->success(null, __('Email sent to :email', ['email' => $user->email]));
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success(self::userPayload($request->user()));
    }

    /** Revokes this device's token and stops push to it. */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        event(new Logout('sanctum', $user));
        $user->currentAccessToken()?->delete();
        $user->forceFill(['fcm_token' => null, 'fcm_platform' => null, 'fcm_token_updated_at' => null])->save();

        return $this->success(null, __('Signed out.'));
    }

    private function issueToken(User $user, ?string $device, ?string $message = null, int $status = 200): JsonResponse
    {
        // The Login listener records last_login_at, message delivery and the audit log, as on the web.
        event(new Login('sanctum', $user, false));
        $token = $user->createToken(Str::limit($device ?: 'mobile', 100, ''))->plainTextToken;

        return $this->success(['two_factor' => false, 'token' => $token, 'token_type' => 'Bearer', 'user' => self::userPayload($user)], $message ?? __('Signed in.'), $status);
    }

    /**
     * The signed-in user as the web shares it (HandleInertiaRequests auth + unread counters).
     *
     * @return array<string, mixed>
     */
    public static function userPayload(User $user): array
    {
        $organization = $user->isProfessional() ? app(CurrentOrganization::class)->for($user) : null;
        $access = app(OrganizationAccess::class);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => PublicFile::url($user->avatar_path),
            'account_type' => $user->account_type->value,
            'area' => $user->isClient() ? 'client' : ($user->isPlatformStaff() ? 'admin' : ($organization?->type->value === 'firm' ? 'firm' : 'lawyer')),
            'locale' => $user->locale,
            'email_verified' => $user->hasVerifiedEmail(),
            'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
            'lawyer_profile_slug' => $user->isLawyer() ? $user->lawyerProfile?->slug : null,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'type' => $organization->type->value,
                'logo_url' => PublicFile::url($organization->logo_path),
                'role' => $access->role($user, $organization)?->value,
                'permissions' => $access->permissions($user, $organization),
            ] : null,
            'unread' => [
                'notifications' => $user->unreadNotifications()->count(),
                'messages' => app(MessagingService::class)->totalUnread($user),
                'appointments' => $organization ? (int) AppointmentController::pendingRequests($user, $organization)?->count() : 0,
            ],
        ];
    }
}
