<?php

namespace Database\Seeders;

use App\Models\Testimonial;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Sample video reviews so the homepage "Video reviews" section has something to play locally.
 * The clips are short walkthroughs of the product screens (database/seeders/media/videos),
 * labelled as sample entries: replace them with real client videos in Admin, Video reviews.
 * Local only (called from DatabaseSeeder in APP_ENV=local).
 */
class VideoReviewSeeder extends Seeder
{
    public function run(): void
    {
        $samples = [
            ['client-portal', 'Rukhsana Bibi', 'The portal showed my next date and the last order the same day the court passed it.', 5],
            ['hearing-outcome', 'Muhammad Arshad', 'I got the outcome of my bail hearing on my phone before I reached home.', 5],
            ['court-diary', 'Advocate Hira Cheema', 'My whole cause list for the day in one screen, with the client numbers beside each case.', 5],
            ['case-file', 'Advocate Kamran Bajwa', 'Every order, adjournment and next date of a five year old suit, in order, in one file.', 4],
        ];

        foreach ($samples as $i => [$file, $name, $body, $rating]) {
            $video = "testimonials/videos/sample-{$file}.mp4";
            $thumb = "testimonials/thumbnails/sample-{$file}.jpg";
            Storage::disk('public')->put($video, (string) file_get_contents(database_path("seeders/media/videos/{$file}.mp4")));
            Storage::disk('public')->put($thumb, (string) file_get_contents(database_path("seeders/media/videos/{$file}.jpg")));

            Testimonial::query()->updateOrCreate(['kind' => 'video', 'name' => $name], [
                'designation' => 'Sample video (demo data)', 'body' => $body, 'rating' => $rating,
                'video_path' => $video, 'thumbnail_path' => $thumb, 'is_verified_client' => $i < 2,
                'is_featured' => $i === 0, 'is_active' => true, 'sort_order' => $i,
            ]);
        }
    }
}
