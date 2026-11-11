<?php

namespace Database\Seeders;

use App\Enums\PaymentMethodKind;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

/**
 * Default plan payment methods. Stripe and bank transfer start enabled;
 * wallet methods are configured but switched off until an admin enables them.
 */
class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            [
                'key' => 'stripe',
                'name' => 'Card (Stripe)',
                'kind' => PaymentMethodKind::Stripe->value,
                'is_enabled' => true,
                'instructions' => 'You will be redirected to Stripe to pay securely by card. Your plan activates automatically after payment.',
                'details' => [],
                'sort_order' => 1,
            ],
            [
                'key' => 'bank_transfer',
                'name' => 'Bank transfer',
                'kind' => PaymentMethodKind::Manual->value,
                'is_enabled' => true,
                'instructions' => 'Transfer the amount to the account below, then upload a screenshot of the payment. Include your account email so we can match it.',
                'details' => [
                    ['label' => 'Bank name', 'value' => ''],
                    ['label' => 'Account title', 'value' => ''],
                    ['label' => 'IBAN', 'value' => ''],
                ],
                'sort_order' => 2,
            ],
            [
                'key' => 'sadapay',
                'name' => 'SadaPay',
                'kind' => PaymentMethodKind::Manual->value,
                'is_enabled' => false,
                'instructions' => 'Send the amount to the SadaPay account shown below and upload a screenshot.',
                'details' => [
                    ['label' => 'Account title', 'value' => ''],
                    ['label' => 'SadaPay number', 'value' => ''],
                ],
                'sort_order' => 3,
            ],
            [
                'key' => 'nayapay',
                'name' => 'NayaPay',
                'kind' => PaymentMethodKind::Manual->value,
                'is_enabled' => false,
                'instructions' => 'Send the amount to the NayaPay account shown below and upload a screenshot.',
                'details' => [
                    ['label' => 'Account title', 'value' => ''],
                    ['label' => 'NayaPay number', 'value' => ''],
                ],
                'sort_order' => 4,
            ],
        ];

        foreach ($methods as $method) {
            PaymentMethod::query()->updateOrCreate(['key' => $method['key']], $method);
        }
    }
}
