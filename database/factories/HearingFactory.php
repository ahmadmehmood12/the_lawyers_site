<?php

namespace Database\Factories;

use App\Enums\HearingStatus;
use App\Enums\HearingType;
use App\Models\Hearing;
use App\Models\LegalCase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Hearing>
 */
class HearingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'legal_case_id' => LegalCase::factory(),
            'organization_id' => fn (array $a) => LegalCase::find($a['legal_case_id'])->organization_id,
            'hearing_date' => today()->addDays(3),
            'hearing_time' => '10:00',
            'hearing_type' => HearingType::Regular,
            'status' => HearingStatus::Scheduled,
            'visible_to_client' => true,
        ];
    }
}
