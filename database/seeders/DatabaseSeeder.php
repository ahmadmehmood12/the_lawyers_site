<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * `php artisan db:seed` / `migrate:fresh --seed`:
 *  - local:      real reference data and content + fake demo data (demo accounts, password "password")
 *  - production: same as ProductionSeeder (real data + the five starting accounts), no fake data
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('local')) {
            $this->call(ProductionSeeder::CONTENT);
            $this->call(DemoDataSeeder::class);

            return;
        }

        $this->call(ProductionSeeder::class);
    }
}
