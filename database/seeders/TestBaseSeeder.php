<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/** Seeded once per test run (RefreshDatabase); each test then runs in a transaction. */
class TestBaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([PlatformRolesSeeder::class, ReferenceDataSeeder::class, PlatformContentSeeder::class, DocumentTemplateSeeder::class, PaymentMethodSeeder::class]);
    }
}
