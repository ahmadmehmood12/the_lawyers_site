<?php

namespace Tests\Feature\Workflows;

use App\Enums\VerificationStatus;
use App\Models\BarCouncil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VerificationAndAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_lawyer_registration_creates_profile_and_practice(): void
    {
        $this->post(route('register'), [
            'registration_type' => 'lawyer', 'name' => 'Zara Khan', 'email' => 'zara@example.com', 'phone' => '0300 1234567',
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertRedirect();

        $user = User::query()->where('email', 'zara@example.com')->sole();
        $this->assertSame('+923001234567', $user->phone);
        $this->assertNotNull($user->lawyerProfile);
        $this->assertSame('owner', $user->memberships()->sole()->role->value);
        $this->assertSame('free', $user->currentOrganization->activeSubscription->plan->slug);
    }

    public function test_firm_and_client_registration(): void
    {
        $base = ['phone' => '03211234567', 'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true];
        $this->post(route('register'), [...$base, 'registration_type' => 'firm', 'name' => 'Owner', 'email' => 'owner@example.com', 'firm_name' => 'Khan & Co'])->assertRedirect();
        auth()->logout();
        $this->post(route('register'), [...$base, 'registration_type' => 'client', 'name' => 'Client', 'email' => 'client@example.com'])->assertRedirect();

        $this->assertDatabaseHas('organizations', ['name' => 'Khan & Co', 'type' => 'firm']);
        $this->assertSame('client', User::query()->where('email', 'client@example.com')->value('account_type')->value);
        $this->assertSame(0, User::query()->where('email', 'client@example.com')->sole()->memberships()->count());
    }

    public function test_registration_rejects_bad_phone_and_cannot_choose_platform_type(): void
    {
        $this->post(route('register'), ['registration_type' => 'platform', 'name' => 'X', 'email' => 'x@example.com', 'phone' => '123', 'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true])
            ->assertSessionHasErrors(['registration_type', 'phone']);
    }

    public function test_suspended_user_cannot_sign_in(): void
    {
        $user = User::factory()->suspended()->create(['password' => 'password123']);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_verification_workflow_end_to_end(): void
    {
        Storage::fake('local');
        Notification::fake();
        $lawyer = $this->lawyer();
        $lawyer->lawyerProfile->update(['bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'X-1', 'advocate_category' => 'high_court']);
        $this->actingAs($lawyer);

        $this->post(route('lawyer.verification.submit'))->assertSessionHasErrors('documents');
        foreach (['cnic_front', 'bar_license'] as $type) {
            $this->post(route('lawyer.verification.upload'), ['type' => $type, 'file' => UploadedFile::fake()->image("{$type}.jpg")])->assertSessionHasNoErrors();
        }
        $this->post(route('lawyer.verification.submit'))->assertSessionHasNoErrors();
        $request = $lawyer->lawyerProfile->latestVerificationRequest()->first();
        $this->assertSame(VerificationStatus::Submitted, $request->status);

        $this->post(route('admin.verifications.transition', $request), ['status' => 'approved'])->assertForbidden();

        $officer = User::factory()->platform()->create();
        $officer->assignRole('verification-officer');
        $this->actingAs($officer)->post(route('admin.verifications.transition', $request), ['status' => 'rejected'])->assertSessionHasErrors('note');
        $this->actingAs($officer)->post(route('admin.verifications.transition', $request), ['status' => 'approved'])->assertSessionHasNoErrors();

        $this->assertTrue($lawyer->lawyerProfile->fresh()->isVerified());
        $this->assertSame(['submitted', 'approved'], $request->events()->pluck('to_status')->all());
    }

    public function test_approved_lawyer_cannot_be_rejected_directly(): void
    {
        $lawyer = $this->lawyer();
        $request = $lawyer->lawyerProfile->verificationRequests()->create(['status' => 'approved']);
        $officer = User::factory()->platform()->create();
        $officer->assignRole('verification-officer');

        $this->actingAs($officer)->post(route('admin.verifications.transition', $request), ['status' => 'rejected', 'note' => 'x'])->assertSessionHasErrors('status');
    }

    public function test_support_staff_cannot_assign_roles(): void
    {
        $support = User::factory()->platform()->create();
        $support->assignRole('support');
        $target = User::factory()->platform()->create();

        $this->actingAs($support)->put(route('admin.users.roles', $target), ['roles' => ['super-admin']])->assertForbidden();
        $this->assertFalse($target->fresh()->hasRole('super-admin'));
    }
}
