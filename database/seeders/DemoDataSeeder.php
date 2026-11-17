<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Fake data for local development and demos only: demo accounts (admin@wakeel.test …), about 170
 * advocates, 30 firms, clients, cases with hearing history, tasks, invoices, appointments, messages,
 * reviews, articles and comments, feedback and verification requests. Needs ProductionSeeder::CONTENT
 * first. Refuses to run outside APP_ENV=local unless you confirm.
 *
 *   php artisan db:seed --class=DemoDataSeeder
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local') && ! $this->command?->confirm('This adds FAKE lawyers, clients and cases. Continue outside local?', false)) {
            $this->command?->warn('Demo data skipped.');

            return;
        }

        $this->call([
            DemoSeeder::class,              // demo accounts, a solo lawyer and a firm with sample cases, feedback
            PlanTestAccountsSeeder::class,  // one sign in per plan
            ReportedJudgmentSeeder::class,  // a few LHC judgments
            PakistanPracticeSeeder::class,  // ~170 advocates, 30 firms, cases, hearings, invoices, reviews (a few minutes)
            ArticleSeeder::class,           // legal-awareness articles and comments
        ]);
    }
}
