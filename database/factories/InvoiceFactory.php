<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'organization_id' => fn (array $a) => Client::find($a['client_id'])->organization_id,
            'number' => 'INV-T-'.fake()->unique()->numerify('#####'),
            'issue_date' => today(),
            'status' => InvoiceStatus::Issued,
            'subtotal' => 10000, 'total' => 10000, 'amount_paid' => 0,
            'created_by' => User::factory(),
        ];
    }
}
