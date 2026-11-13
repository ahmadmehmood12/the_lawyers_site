<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\CaseStatus;
use App\Enums\OrganizationType;
use App\Enums\PlanFeature;
use App\Models\Client;
use App\Models\LegalCase;
use App\Models\Plan;
use App\Models\User;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Database\Seeder;

/**
 * One sign in per plan, for testing limits and the Upgrade window (docs/Modules/Administration.md).
 * Password "password". Safe to re-run: accounts are matched by email and their plan is reset.
 *
 *   plan.free@wakeel.test         Zainab Rauf        Free (already at 15 of 15 active cases)
 *   plan.basic@wakeel.test        Usman Tariq        Basic
 *   plan.professional@wakeel.test Hira Javed         Professional
 *   plan.premium@wakeel.test      Hamza Iqbal        Premium
 *   plan.firm@wakeel.test         Saad Mirza         Law Firm (firm "Mirza & Partners")
 *
 * Local only: php artisan db:seed --class=PlanTestAccountsSeeder
 */
class PlanTestAccountsSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('PlanTestAccountsSeeder runs only in the local environment.');

            return;
        }

        $accounts = [
            ['free', 'Zainab Rauf', 'plan.free@wakeel.test', '+923001110001', null],
            ['basic', 'Usman Tariq', 'plan.basic@wakeel.test', '+923001110002', null],
            ['professional', 'Hira Javed', 'plan.professional@wakeel.test', '+923001110003', null],
            ['premium', 'Hamza Iqbal', 'plan.premium@wakeel.test', '+923001110004', null],
            ['law-firm', 'Saad Mirza', 'plan.firm@wakeel.test', '+923001110005', 'Mirza & Partners'],
        ];

        $provisioner = app(OrganizationProvisioner::class);
        $profiles = app(LawyerProfileService::class);
        $subscriptions = app(SubscriptionService::class);

        foreach ($accounts as [$slug, $name, $email, $phone, $firm]) {
            $plan = Plan::query()->where('slug', $slug)->first();

            if (! $plan) {
                $this->command?->warn("Plan {$slug} not found; skipped {$email}.");

                continue;
            }

            $user = User::query()->where('email', $email)->first() ?? User::query()->forceCreate([
                'name' => $name, 'email' => $email, 'password' => 'password', 'account_type' => AccountType::Lawyer,
                'phone' => $phone, 'email_verified_at' => now(), 'locale' => 'en',
            ]);

            $profiles->createFor($user);
            $organization = $user->organizations()->where('owner_id', $user->id)->first()
                ?? ($firm ? $provisioner->create($user, OrganizationType::Firm, $firm) : $provisioner->createSoloPractice($user));
            $user->forceFill(['current_organization_id' => $organization->id])->save();

            $subscriptions->start($organization, $plan, 'monthly');

            // The free account sits exactly at its active case limit, so "New case" opens the Upgrade window.
            if ($slug === 'free') {
                $limit = (int) ($plan->loadMissing('features')->limitFor(PlanFeature::MaxActiveCases) ?? 15);
                $open = LegalCase::query()->where('organization_id', $organization->id)->whereIn('status', CaseStatus::openValues())->count();

                if ($open < $limit) {
                    $client = Client::factory()->create(['organization_id' => $organization->id, 'name' => 'Muhammad Arshad', 'created_by' => $user->id]);
                    LegalCase::factory()->count($limit - $open)->create(['organization_id' => $organization->id, 'created_by' => $user->id])
                        ->each(fn (LegalCase $case) => $case->lawyers()->syncWithoutDetaching([$user->id => ['role' => 'lead']]))
                        ->each(fn (LegalCase $case) => $case->clients()->syncWithoutDetaching([$client->id]));
                }
            }

            $this->command?->info("{$email} → {$plan->name}");
        }
    }
}
