<?php

namespace Database\Factories;

use App\Enums\AccountType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'account_type' => AccountType::Lawyer,
            'phone' => '+923'.fake()->numerify('#########'),
            'locale' => 'en',
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function client(): static
    {
        return $this->state(['account_type' => AccountType::Client]);
    }

    public function staff(): static
    {
        return $this->state(['account_type' => AccountType::Staff]);
    }

    public function platform(): static
    {
        return $this->state(['account_type' => AccountType::Platform]);
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended', 'suspended_at' => now()]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
