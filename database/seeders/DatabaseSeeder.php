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
            PakistanGeographySeeder::class,
            PunjabJudiciarySeeder::class,
            PlatformContentSeeder::class,
            PaymentMethodSeeder::class,
            DocumentTemplateSeeder::class,
            FaqSeeder::class,
            CourtHolidaySeeder::class,
            LegalFormSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
            $this->call(PlanTestAccountsSeeder::class);
            $this->call(ReportedJudgmentSeeder::class);
            $this->call(VideoReviewSeeder::class);
            // About 160 advocates, 30 firms and their cases with full history (takes a few minutes).
            $this->call(PakistanPracticeSeeder::class);
            // Legal-awareness articles; in production run `php artisan db:seed --class=ArticleSeeder` after counsel review.
            $this->call(ArticleSeeder::class);
        }
    }
}
