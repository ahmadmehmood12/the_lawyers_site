<?php

namespace Tests\Feature;

use App\Enums\HearingStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_urdu_switch_sets_rtl_and_translates(): void
    {
        $this->post(route('locale.update'), ['locale' => 'ur'])->assertRedirect();

        $this->get(route('home'))->assertOk()->assertSee('dir="rtl"', false)->assertSee('lang="ur"', false);
    }

    public function test_user_preference_drives_validation_language(): void
    {
        $user = $this->lawyer();
        $user->forceFill(['locale' => 'ur'])->save();

        $this->actingAs($user)->post(route('clients.store'), [])->assertSessionHasErrors(['name' => 'نام درکار ہے۔']);
    }

    public function test_enum_labels_are_localized(): void
    {
        app()->setLocale('ur');
        $this->assertSame('ملتوی', HearingStatus::Adjourned->label());
        app()->setLocale('en');
        $this->assertSame('Adjourned', HearingStatus::Adjourned->label());
    }

    public function test_unsupported_locale_is_rejected(): void
    {
        $this->post(route('locale.update'), ['locale' => 'fr'])->assertSessionHasErrors('locale');
    }
}
