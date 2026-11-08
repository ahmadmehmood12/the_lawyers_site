<?php

namespace Database\Factories;

use App\Models\LawyerProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LawyerProfile>
 */
class LawyerProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'slug' => 'adv-'.Str::lower(Str::random(10)),
            'practice_since' => 2015,
            'is_public' => true,
        ];
    }
}
