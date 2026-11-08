<?php

namespace Tests\Feature\Admin;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BrandingAndMailSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->platform()->create();
        $admin->assignRole('super-admin');

        return $admin;
    }

    public function test_admin_saves_branding_and_it_is_shared_on_every_page(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin())->post(route('admin.branding-settings.update'), [
            'site_name' => 'WakeelDiary',
            'site_tagline' => 'Court diary for advocates',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
            'favicon' => UploadedFile::fake()->create('favicon.ico', 4, 'image/x-icon'),
            'social_facebook' => 'https://facebook.com/wakeeldiary',
            'social_youtube' => '',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('WakeelDiary', Setting::get('site_name'));
        Storage::disk('public')->assertExists(Setting::get('site_logo_path'));
        Storage::disk('public')->assertExists(Setting::get('site_favicon_path'));

        $this->get(route('home'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('app.name', 'WakeelDiary')
            ->where('app.tagline', 'Court diary for advocates')
            ->where('app.social.facebook', 'https://facebook.com/wakeeldiary')
            ->where('app.social.youtube', null)
            ->whereNot('app.logo_url', null));
    }

    public function test_social_links_must_be_web_addresses(): void
    {
        $this->actingAs($this->admin())->post(route('admin.branding-settings.update'), [
            'site_name' => 'WakeelDiary',
            'social_instagram' => 'javascript:alert(1)',
        ])->assertSessionHasErrors('social_instagram');
    }

    public function test_mail_settings_are_applied_and_the_password_stays_encrypted(): void
    {
        $this->actingAs($this->admin())->put(route('admin.mail-settings.update'), [
            'mail_mailer' => 'smtp',
            'mail_scheme' => 'smtps',
            'mail_host' => 'smtp.example.com',
            'mail_port' => 465,
            'mail_username' => 'mailer@example.com',
            'mail_password' => 'smtp-secret-123',
            'mail_from_address' => 'hello@example.com',
            'mail_from_name' => 'WakeelDiary',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('smtp.example.com', config('mail.mailers.smtp.host'));
        $this->assertSame(465, config('mail.mailers.smtp.port'));
        $this->assertSame('smtp-secret-123', config('mail.mailers.smtp.password'));
        $this->assertStringNotContainsString('smtp-secret-123', (string) Setting::query()->where('key', 'mail_password')->value('value'));

        $this->get(route('admin.settings.edit'))->assertInertia(fn (Assert $page) => $page
            ->where('mail.host', 'smtp.example.com')
            ->where('mail.has_password', true)
            ->where('mail.password', null));
    }

    public function test_test_email_reports_the_log_mailer_honestly(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->put(route('admin.mail-settings.update'), ['mail_mailer' => 'log'])->assertSessionHasNoErrors();

        $this->actingAs($admin)->post(route('admin.mail-settings.test'), ['to' => 'admin@example.com'])
            ->assertRedirect()
            ->assertSessionHas('success', fn (string $message) => str_contains($message, 'log'));
    }

    public function test_non_admins_cannot_change_branding_or_mail(): void
    {
        $lawyer = $this->lawyer();

        $this->actingAs($lawyer)->post(route('admin.branding-settings.update'), ['site_name' => 'Hacked'])->assertForbidden();
        $this->actingAs($lawyer)->put(route('admin.mail-settings.update'), ['mail_mailer' => 'smtp'])->assertForbidden();
        $this->assertNotSame('Hacked', Setting::get('site_name'));
    }
}
