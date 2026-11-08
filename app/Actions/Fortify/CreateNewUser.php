<?php

namespace App\Actions\Fortify;

use App\Enums\AccountType;
use App\Enums\OrganizationType;
use App\Models\User;
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
 *  - lawyer: user + lawyer profile + solo practice organization
 *  - firm:   user + lawyer profile + firm organization (owner)
 *  - client: user only (client records are linked by lawyers or on booking)
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
        Validator::make($input, [
            'registration_type' => ['required', Rule::in(['lawyer', 'firm', 'client'])],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'phone' => ['required', 'string', new PakistaniPhone],
            'firm_name' => ['required_if:registration_type,firm', 'nullable', 'string', 'max:160'],
            'password' => $this->passwordRules(),
            'terms' => ['accepted'],
        ])->validate();

        $type = $input['registration_type'];

        return DB::transaction(function () use ($input, $type): User {
            $user = User::create([
                'name' => $input['name'],
                'email' => strtolower($input['email']),
                'phone' => PakistaniPhone::normalize($input['phone']),
                'password' => $input['password'],
                'account_type' => $type === 'client' ? AccountType::Client : AccountType::Lawyer,
                'locale' => in_array(app()->getLocale(), ['en', 'ur'], true) ? app()->getLocale() : 'en',
            ]);

            if ($type === 'lawyer') {
                $this->profiles->createFor($user);
                $this->organizations->createSoloPractice($user);
            }

            if ($type === 'firm') {
                $this->profiles->createFor($user);
                $this->organizations->create($user, OrganizationType::Firm, $input['firm_name']);
            }

            return $user;
        });
    }
}
