<?php

namespace Database\Factories;

use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\Priority;
use App\Models\LegalCase;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LegalCase>
 */
class LegalCaseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'reference' => 'CASE-'.fake()->unique()->numerify('######'),
            'title' => fake()->lastName().' vs. '.fake()->lastName(),
            'case_type' => CaseType::Civil,
            'status' => CaseStatus::Filed,
            'priority' => Priority::Normal,
            'share_with_client' => true,
        ];
    }
}
