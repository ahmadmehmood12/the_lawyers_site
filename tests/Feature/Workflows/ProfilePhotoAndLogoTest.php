<?php

namespace Tests\Feature\Workflows;

use App\Enums\OrganizationType;
use App\Enums\OrgRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfilePhotoAndLogoTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_account_type_can_upload_and_remove_a_profile_photo(): void
    {
        Storage::fake('public');
        [$client] = $this->clientUserFor($this->org($this->lawyer()));
        $admin = User::factory()->platform()->create();
        $admin->assignRole('support');

        foreach ([$this->lawyer(), $client, $admin] as $user) {
            $this->actingAs($user)->post(route('account.avatar.update'), ['avatar' => UploadedFile::fake()->image('me.jpg', 400, 300)])
                ->assertRedirect()->assertSessionHasNoErrors();

            $path = $user->fresh()->avatar_path;
            $this->assertStringEndsWith('.jpg', $path);
            Storage::disk('public')->assertExists($path);
            $this->get(route('account.edit'))->assertInertia(fn (Assert $page) => $page->whereNot('auth.user.avatar_url', null));

            $this->actingAs($user)->delete(route('account.avatar.destroy'))->assertRedirect();
            $this->assertNull($user->fresh()->avatar_path);
            Storage::disk('public')->assertMissing($path);
        }
    }

    public function test_non_images_are_rejected(): void
    {
        Storage::fake('public');

        $this->actingAs($this->lawyer())->post(route('account.avatar.update'), ['avatar' => UploadedFile::fake()->create('script.php', 4, 'text/x-php')])
            ->assertSessionHasErrors('avatar');
    }

    public function test_firm_owner_uploads_a_logo_but_a_clerk_cannot(): void
    {
        Storage::fake('public');
        $owner = $this->lawyer(OrganizationType::Firm);
        $organization = $this->org($owner);
        $clerk = $this->member($organization, OrgRole::Clerk, staff: true);

        $this->actingAs($owner)->post(route('settings.organization.logo.update'), ['logo' => UploadedFile::fake()->image('logo.png', 300, 120)])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertStringEndsWith('.png', $organization->fresh()->logo_path);
        Storage::disk('public')->assertExists($organization->fresh()->logo_path);

        $this->actingAs($clerk)->post(route('settings.organization.logo.update'), ['logo' => UploadedFile::fake()->image('x.png', 100, 100)])->assertForbidden();
        $this->actingAs($clerk)->delete(route('settings.organization.logo.destroy'))->assertForbidden();
    }
}
