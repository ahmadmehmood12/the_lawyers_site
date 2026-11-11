<?php

namespace Tests\Feature\Admin;

use App\Models\Page;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_pages_render_for_super_admin(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');
        $this->actingAs($admin);

        foreach (['admin.dashboard', 'admin.users.index', 'admin.verifications.index', 'admin.organizations.index', 'admin.courts.index', 'admin.judges.index', 'admin.specializations.index', 'admin.geography.index', 'admin.templates.index', 'admin.articles.index', 'admin.reviews.index', 'admin.pages.index', 'admin.complaints.index', 'admin.plans.index', 'admin.notifications.index', 'admin.settings.edit', 'admin.audit.index', 'admin.payment-methods.index', 'admin.payments.index'] as $route) {
            $this->get(route($route))->assertOk();
        }
        foreach (['districts', 'cities', 'court-types', 'bar-councils'] as $resource) {
            $this->get(route('admin.reference.index', $resource))->assertOk();
        }
    }

    public function test_admin_can_switch_the_site_theme(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        $this->actingAs($admin)->put(route('admin.settings.update'), [
            'default_plan' => 'free',
            'support_email' => 'support@example.com',
            'ai_enabled' => '0',
            'ai_redact_personal_data' => '1',
            'reviews_require_moderation' => '1',
            'site_theme' => 'white-green',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('white-green', Setting::get('site_theme'));

        $this->actingAs($admin)->get(route('admin.settings.edit'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('settings.site_theme', 'white-green')
            ->where('app.site_theme', 'white-green'));
    }

    public function test_admin_can_create_and_delete_a_website_page(): void
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        $this->actingAs($admin)->post(route('admin.pages.store'), [
            'slug' => 'refund-policy',
            'title' => 'Refund Policy',
            'body' => '<p>Refunds are reviewed by the firm.</p>',
            'is_published' => true,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $page = Page::query()->where('slug', 'refund-policy')->firstOrFail();
        $this->get('/refund-policy')->assertOk()->assertInertia(fn (AssertableInertia $inertia) => $inertia
            ->component('Public/Page')
            ->where('page.title', 'Refund Policy'));

        $this->actingAs($admin)->delete(route('admin.pages.destroy', $page))->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('pages', ['slug' => 'refund-policy']);
        $this->get('/refund-policy')->assertNotFound();
    }

    public function test_verification_officer_cannot_open_billing(): void
    {
        $officer = User::factory()->platform()->create();
        $officer->assignRole('verification-officer');

        $this->actingAs($officer)->get(route('admin.verifications.index'))->assertOk();
        $this->actingAs($officer)->get(route('admin.plans.index'))->assertForbidden();
    }
}
