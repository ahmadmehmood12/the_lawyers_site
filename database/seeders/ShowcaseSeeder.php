<?php

namespace Database\Seeders;

use App\Models\TeamDesignation;
use App\Models\TeamMember;
use App\Models\Testimonial;
use Illuminate\Database\Seeder;

/**
 * Starter homepage showcase: text testimonials and Team & founders placeholders (video reviews are in
 * VideoReviewSeeder). These are samples, not real clients or people, so outside local they are created
 * hidden: replace the text, photo and name in Admin, Testimonials / Team & founders, then switch each on.
 * Publishing invented reviews on a live site would mislead visitors. Never changes rows an admin edited.
 */
class ShowcaseSeeder extends Seeder
{
    public function run(): void
    {
        $visible = app()->environment('local');

        $testimonials = [
            ['Ahmed Raza', 'The diary reminded me of my hearing a day early and my lawyer\'s notes were waiting in the portal. I always knew what was happening in my case.', 5, true],
            ['Fatima Noor', 'Booking the first consultation took two minutes, and the lawyer confirmed the same evening. Payments and receipts were all in one place.', 5, true],
            ['Usman Sheikh', 'As a junior advocate, having every order and next date in one file has made court days far calmer.', 4, false],
        ];
        foreach ($testimonials as $i => [$name, $body, $rating, $client]) {
            Testimonial::query()->firstOrCreate(['name' => $name, 'kind' => 'text'], [
                'designation' => 'Sample entry (replace before publishing)', 'body' => $body, 'rating' => $rating,
                'is_verified_client' => false, 'is_featured' => $i === 0, 'is_active' => $visible, 'sort_order' => $i,
            ]);
        }

        $team = [
            ['Founder', 'Sample Founder', 'LL.B., Advocate High Court', '15 years in civil and family litigation'],
            ['Patron', 'Sample Patron', 'LL.M., Advocate Supreme Court', '30 years at the bar'],
            ['Legal Advisor', 'Sample Legal Advisor', 'LL.B. (Hons)', '10 years in criminal practice'],
        ];
        foreach ($team as $i => [$designation, $name, $qualifications, $experience]) {
            TeamMember::query()->firstOrCreate(['name' => $name], [
                'team_designation_id' => TeamDesignation::query()->where('name', $designation)->value('id'),
                'qualifications' => $qualifications, 'experience' => $experience, 'sort_order' => $i, 'is_active' => $visible,
                'bio' => 'Placeholder. Replace with the real profile and photo in Admin, Team & founders.',
            ]);
        }
    }
}
