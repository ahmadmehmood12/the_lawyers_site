<?php

namespace Database\Factories;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Faq> */
class FaqFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'category' => fake()->randomElement(['Advocates', 'Clients', 'Privacy', 'Billing']),
            'question' => rtrim(fake()->sentence(8), '.').'?',
            'answer' => fake()->paragraph(),
            'show_on_home' => false,
            'is_active' => true,
            'sort_order' => fake()->numberBetween(0, 50),
        ];
    }
}
