<?php

namespace Tests\Feature\Public;

use App\Models\LawyerProfile;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PublicPagesTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{0: string}> */
    public static function pages(): array
    {
        return array_map(fn ($r) => [$r], array_combine(
            ['home', 'lawyers', 'firms', 'practice areas', 'articles', 'documentation', 'pricing', 'contact', 'about', 'faqs', 'terms', 'privacy', 'resources', 'login', 'register', 'forgot password'],
            ['home', 'lawyers.index', 'firms.index', 'specializations.index', 'articles.index', 'documentation', 'pricing', 'contact', 'about', 'faqs', 'terms', 'privacy', 'resources', 'login', 'register', 'password.request'],
        ));
    }

    #[DataProvider('pages')]
    public function test_public_page_renders(string $route): void
    {
        $this->get(route($route))->assertOk();
    }

    public function test_home_lists_only_active_plans_for_the_pricing_table(): void
    {
        Plan::create(['slug' => 'solo', 'name' => 'Solo', 'audience' => 'lawyer', 'price_monthly' => 1500, 'price_yearly' => 15000, 'trial_days' => 14, 'is_active' => true, 'sort_order' => 1]);
        Plan::create(['slug' => 'retired', 'name' => 'Retired', 'audience' => 'lawyer', 'price_monthly' => 900, 'price_yearly' => 9000, 'trial_days' => 0, 'is_active' => false, 'sort_order' => 2]);

        $this->get(route('home'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Home')
            ->where('plans', fn ($plans) => collect($plans)->pluck('slug')->contains('solo') && ! collect($plans)->pluck('slug')->contains('retired'))
            ->has('specializations')
            ->has('cities'));
    }

    public function test_listed_lawyer_profile_renders_and_unlisted_is_hidden(): void
    {
        $listed = LawyerProfile::factory()->create(['is_public' => true]);
        $hidden = LawyerProfile::factory()->create(['is_public' => false]);

        $this->get(route('lawyers.show', $listed->slug))->assertOk();
        $this->get(route('lawyers.show', $hidden->slug))->assertNotFound();
    }

    public function test_sitemap_and_robots_exclude_private_areas(): void
    {
        $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml');
        $this->get('/robots.txt')->assertOk()->assertSee('Disallow: /cases')->assertSee('Disallow: /portal');
    }
}
