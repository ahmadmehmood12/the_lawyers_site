<?php

namespace Database\Factories;

use App\Enums\OrganizationType;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->company().' Law Chambers';

        return [
            'type' => OrganizationType::Solo,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(5)),
            'owner_id' => User::factory(),
            'status' => 'active',
        ];
    }

    public function firm(): static
    {
        return $this->state(['type' => OrganizationType::Firm]);
    }
}
