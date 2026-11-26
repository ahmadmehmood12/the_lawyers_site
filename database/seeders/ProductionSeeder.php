<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Everything a live site needs and nothing else (docs/Database/Seeders.md):
 *
 *   php artisan migrate:fresh --force
 *   php artisan db:seed --class=ProductionSeeder --force
 *
 * Reference data, roles, plans, content and five starting accounts. No demo lawyers, firms, clients,
 * cases, hearings, messages, appointments, reviews, articles, feedback or verification requests;
 * those stay in DemoDataSeeder for local use. Every seeder here is safe to re-run.
 */
class ProductionSeeder extends Seeder
{
    /**
     * Content and reference data, in dependency order.
     *
     * @var list<class-string<Seeder>>
     */
    public const CONTENT = [
        PlatformRolesSeeder::class,      // Roles and permissions (admin panel)
        ReferenceDataSeeder::class,      // Provinces, court types, courts, specializations, bar councils
        PakistanGeographySeeder::class,  // Districts, cities and tehsils
        PunjabJudiciarySeeder::class,    // Punjab courts per station and judges
        PunjabDistrictSessionsJudgesSeeder::class, // D&SJs in sessions, special courts and tribunals (LHC list 23-11-2026)
        CourtHolidaySeeder::class,       // Court calendar (gazetted holidays)
        PlatformContentSeeder::class,    // Plans, WhatsApp notification templates, website pages, team designations, settings
        PaymentMethodSeeder::class,      // Plan payment methods
        DocumentTemplateSeeder::class,   // Drafting templates
        LegalFormSeeder::class,          // Wakalatnama and Power of Attorney forms
        FaqSeeder::class,                // FAQs (English and Urdu)
        ShowcaseSeeder::class,           // Testimonials and Team & founders (hidden samples outside local)
        VideoReviewSeeder::class,        // Video reviews (hidden samples outside local)
    ];

    public function run(): void
    {
        $this->call(self::CONTENT);
        $this->call(CoreUsersSeeder::class); // admin, verifier, one lawyer, one law firm, one client
    }
}
