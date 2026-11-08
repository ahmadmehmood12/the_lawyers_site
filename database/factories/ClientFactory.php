<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'type' => 'individual',
            'name' => fake()->name(),
            'phone' => '+923'.fake()->numerify('#########'),
            'email' => fake()->safeEmail(),
            'preferred_locale' => 'en',
        ];
    }
}
