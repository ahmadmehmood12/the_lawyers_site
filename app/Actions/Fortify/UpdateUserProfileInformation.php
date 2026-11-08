<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Rules\PakistaniPhone;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;

class UpdateUserProfileInformation implements UpdatesUserProfileInformation
{
    /**
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function update(User $user, array $input): void
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', new PakistaniPhone],
            'locale' => ['required', Rule::in(['en', 'ur'])],
        ])->validateWithBag('updateProfileInformation');

        $phone = PakistaniPhone::normalize($input['phone'] ?? null);
        $attributes = ['name' => $input['name'], 'locale' => $input['locale']];

        if ($phone !== $user->phone) {
            $attributes['phone'] = $phone;
            $attributes['phone_verified_at'] = null;
        }

        if (strtolower($input['email']) !== $user->email) {
            $attributes['email'] = strtolower($input['email']);
            $attributes['email_verified_at'] = null;
            $user->forceFill($attributes)->save();
            $user->sendEmailVerificationNotification();

            return;
        }

        $user->forceFill($attributes)->save();
    }
}
