<?php

namespace Tests\Feature\Workflows;

use App\Enums\OrganizationType;
use App\Enums\VerificationStatus;
use App\Models\BarCouncil;
use App\Models\Organization;
use App\Models\PromoCode;
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
            'cnic' => '35202-1234567-1', 'bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'PBC-1234',
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertRedirect();

        $user = User::query()->where('email', 'zara@example.com')->sole();
        $this->assertSame('+923001234567', $user->phone);
        $this->assertNotNull($user->lawyerProfile);
        $this->assertSame('35202-1234567-1', $user->lawyerProfile->cnic);
        $this->assertSame('PBC-1234', $user->lawyerProfile->enrollment_number);
        $this->assertSame('owner', $user->memberships()->sole()->role->value);
        $this->assertSame('free', $user->currentOrganization->activeSubscription->plan->slug);
    }

    public function test_professional_registration_requires_bar_enrollment_details(): void
    {
        $this->post(route('register'), [
            'registration_type' => 'lawyer', 'name' => 'Zara Khan', 'email' => 'zara@example.com', 'phone' => '0300 1234567',
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertSessionHasErrors(['cnic', 'bar_council_id', 'enrollment_number']);

        $this->post(route('register'), [
            'registration_type' => 'firm', 'name' => 'Owner', 'email' => 'owner@example.com', 'phone' => '0300 1234567',
            'firm_name' => 'Khan & Co', 'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertSessionHasErrors(['cnic', 'bar_council_id', 'enrollment_number', 'firm_registration_number']);
    }

    public function test_firm_and_client_registration(): void
    {
        $base = [
            'phone' => '03211234567', 'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
            'cnic' => '35202-1234567-1', 'bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'PBC-4321',
        ];
        $this->post(route('register'), [...$base, 'registration_type' => 'firm', 'name' => 'Owner', 'email' => 'owner@example.com', 'firm_name' => 'Khan & Co', 'firm_registration_number' => 'SECP-123'])->assertRedirect();
        auth()->logout();
        $this->post(route('register'), [...$base, 'registration_type' => 'client', 'name' => 'Client', 'email' => 'client@example.com'])->assertRedirect();

        $firm = Organization::query()->where('name', 'Khan & Co')->sole();
        $this->assertSame('firm', $firm->type->value);
        $this->assertSame('SECP-123', $firm->registration_number);
        $this->assertNotNull($firm->invite_code);
        $this->assertSame('client', User::query()->where('email', 'client@example.com')->value('account_type')->value);
        $this->assertSame(0, User::query()->where('email', 'client@example.com')->sole()->memberships()->count());
    }

    public function test_referral_and_coupon_codes_are_recorded_and_redeemed(): void
    {
        $referral = PromoCode::create(['code' => 'WD-REF-1', 'type' => 'referral', 'is_active' => true]);
        $coupon = PromoCode::create(['code' => 'WD-TRIAL', 'type' => 'coupon', 'is_active' => true, 'bonus_trial_days' => 14]);

        $this->post(route('register'), [
            'registration_type' => 'lawyer', 'name' => 'Zara Khan', 'email' => 'zara@example.com', 'phone' => '0300 1234567',
            'cnic' => '35202-1234567-1', 'bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'PBC-9999',
            'referral_code' => 'wd-ref-1', 'coupon_code' => 'wd-trial',
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertRedirect();

        $user = User::query()->where('email', 'zara@example.com')->sole();
        $this->assertSame('WD-REF-1', $user->referral_code);
        $this->assertSame('WD-TRIAL', $user->coupon_code);
        $this->assertSame(1, $referral->fresh()->uses);
        $this->assertSame(1, $coupon->fresh()->uses);
    }

    public function test_invalid_codes_are_rejected(): void
    {
        $this->post(route('register'), [
            'registration_type' => 'lawyer', 'name' => 'Zara Khan', 'email' => 'zara@example.com', 'phone' => '0300 1234567',
            'cnic' => '35202-1234567-1', 'bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'PBC-1111',
            'referral_code' => 'NOPE', 'coupon_code' => 'NOPE', 'firm_invite_code' => 'NOPE',
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertSessionHasErrors(['referral_code', 'coupon_code', 'firm_invite_code']);
    }

    public function test_lawyer_can_join_an_existing_firm_with_an_invite_code(): void
    {
        $owner = $this->lawyer(OrganizationType::Firm);
        $firm = $owner->currentOrganization;

        $this->post(route('register'), [
            'registration_type' => 'lawyer', 'name' => 'Associate', 'email' => 'associate@example.com', 'phone' => '0300 7654321',
            'cnic' => '35202-7654321-9', 'bar_council_id' => BarCouncil::query()->value('id'), 'enrollment_number' => 'PBC-2222',
            'firm_invite_code' => $firm->invite_code,
            'password' => 'password123', 'password_confirmation' => 'password123', 'terms' => true,
        ])->assertRedirect();

        $user = User::query()->where('email', 'associate@example.com')->sole();
        $this->assertSame($firm->id, $user->current_organization_id);
        $this->assertSame('associate_advocate', $user->memberships()->where('organization_id', $firm->id)->sole()->role->value);
        $this->assertSame(0, Organization::query()->where('owner_id', $user->id)->count());
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
