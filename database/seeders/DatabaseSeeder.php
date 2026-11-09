<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlatformRolesSeeder::class,
            ReferenceDataSeeder::class,
            PlatformContentSeeder::class,
            DocumentTemplateSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
            // Legal-awareness articles; in production run `php artisan db:seed --class=ArticleSeeder` after counsel review.
            $this->call(ArticleSeeder::class);
        }
    }
}
