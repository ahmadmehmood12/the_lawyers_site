<?php

namespace App\Actions\Fortify;

use App\Enums\AccountType;
use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\Organization;
use App\Models\PromoCode;
use App\Models\User;
use App\Rules\Cnic;
use App\Rules\PakistaniPhone;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Registration for three journeys (docs/Modules/Authentication.md):
 *  - lawyer: user + lawyer profile + solo practice (or an existing firm via invite code)
 *  - firm:   user + lawyer profile + firm organization (owner)
 *  - client: user only (client records are linked by lawyers or on booking)
 *
 * Advocates and firms must supply their CNIC, Bar Council and enrollment number.
 * Referral and coupon codes are optional and validated against active promo codes.
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(private OrganizationProvisioner $organizations, private LawyerProfileService $profiles) {}

    /**
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        $type = $input['registration_type'] ?? '';
        $professional = in_array($type, ['lawyer', 'firm'], true);

        $validator = Validator::make($input, [
            'registration_type' => ['required', Rule::in(['lawyer', 'firm', 'client'])],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'phone' => ['required', 'string', new PakistaniPhone],
            'firm_name' => ['required_if:registration_type,firm', 'nullable', 'string', 'max:160'],
            'firm_registration_number' => ['required_if:registration_type,firm', 'nullable', 'string', 'max:60'],
            'cnic' => $professional ? ['required', 'string', new Cnic] : ['nullable', 'string'],
            'bar_council_id' => $professional ? ['required', 'integer', Rule::exists('bar_councils', 'id')] : ['nullable'],
            'enrollment_number' => $professional
                ? ['required', 'string', 'max:60', Rule::unique('lawyer_profiles', 'enrollment_number')->where(fn ($query) => $query->where('bar_council_id', $input['bar_council_id'] ?? null))]
                : ['nullable', 'string', 'max:60'],
            'referral_code' => ['nullable', 'string', 'max:40'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
            'firm_invite_code' => ['nullable', 'string', 'max:20'],
            'password' => $this->passwordRules(),
            'terms' => ['accepted'],
        ]);

        $validator->after(function ($validator) use ($input, $type): void {
            if (filled($input['referral_code'] ?? null) && ! PromoCode::findUsable($input['referral_code'], 'referral')) {
                $validator->errors()->add('referral_code', __('This referral code is not valid or has expired.'));
            }

            if (filled($input['coupon_code'] ?? null) && ! PromoCode::findUsable($input['coupon_code'], 'coupon')) {
                $validator->errors()->add('coupon_code', __('This coupon code is not valid or has expired.'));
            }

            if (filled($input['firm_invite_code'] ?? null)) {
                if ($type !== 'lawyer') {
                    $validator->errors()->add('firm_invite_code', __('Firm invite codes can only be used by advocates.'));
                } elseif (! $this->firmForInviteCode($input['firm_invite_code'])) {
                    $validator->errors()->add('firm_invite_code', __('This firm invite code is not recognised.'));
                }
            }
        });

        $validator->validate();

        return DB::transaction(function () use ($input, $type): User {
            $referral = PromoCode::findUsable($input['referral_code'] ?? null, 'referral');
            $coupon = PromoCode::findUsable($input['coupon_code'] ?? null, 'coupon');

            $user = User::create([
                'name' => $input['name'],
                'email' => strtolower($input['email']),
                'phone' => PakistaniPhone::normalize($input['phone']),
                'password' => $input['password'],
                'account_type' => $type === 'client' ? AccountType::Client : AccountType::Lawyer,
                'locale' => in_array(app()->getLocale(), ['en', 'ur'], true) ? app()->getLocale() : 'en',
                'referral_code' => $referral?->code,
                'coupon_code' => $coupon?->code,
            ]);

            $organization = null;

            if ($type !== 'client') {
                $this->profiles->createFor($user, [
                    'cnic' => Cnic::normalize($input['cnic'] ?? null),
                    'bar_council_id' => $input['bar_council_id'] ?? null,
                    'enrollment_number' => trim((string) ($input['enrollment_number'] ?? '')),
                ]);

                if ($type === 'firm') {
                    $organization = $this->organizations->create($user, OrganizationType::Firm, $input['firm_name'], [
                        'registration_number' => $input['firm_registration_number'] ?? null,
                    ]);
                } elseif ($firm = $this->firmForInviteCode($input['firm_invite_code'] ?? null)) {
                    // Every advocate keeps their own chambers, so leaving the firm never stops their work.
                    $this->organizations->createSoloPractice($user);
                    $this->organizations->addMember($firm, $user, OrgRole::AssociateAdvocate);
                    $user->forceFill(['current_organization_id' => $firm->id])->save();
                    $organization = $firm;
                } else {
                    $organization = $this->organizations->createSoloPractice($user);
                }
            }

            if ($coupon && $organization && $organization->owner_id === $user->id) {
                $this->applyBonusTrial($organization, $coupon);
            }

            $referral?->redeem();
            $coupon?->redeem();

            return $user;
        });
    }

    private function firmForInviteCode(?string $code): ?Organization
    {
        $code = strtoupper(trim((string) $code));

        if ($code === '') {
            return null;
        }

        return Organization::query()
            ->where('invite_code', $code)
            ->where('type', OrganizationType::Firm->value)
            ->first();
    }

    private function applyBonusTrial(Organization $organization, PromoCode $coupon): void
    {
        if ($coupon->bonus_trial_days < 1) {
            return;
        }

        $subscription = $organization->activeSubscription;

        if (! $subscription) {
            return;
        }

        $from = $subscription->ends_at && $subscription->ends_at->isFuture() ? $subscription->ends_at : now();
        $until = $from->copy()->addDays($coupon->bonus_trial_days);

        $subscription->forceFill([
            'trial_ends_at' => $until,
            'ends_at' => $until,
        ])->save();
    }
}
