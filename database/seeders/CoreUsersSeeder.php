<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\OrganizationType;
use App\Enums\PlatformRole;
use App\Models\User;
use App\Services\Lawyers\LawyerProfileService;
use App\Services\Organizations\OrganizationProvisioner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The five starting accounts for production (config/seeding.php, SEED_* in .env):
 *  - admin     platform super admin
 *  - verifier  verification officer (reviews Bar enrollment requests)
 *  - lawyer    one advocate with their own chambers on the default plan
 *  - firm      a law firm owner with the firm organization
 *  - client    one client account for the portal
 * Emails are verified so they can sign in at once. Existing emails are left untouched.
 * Profiles start empty and unverified: complete them from the app.
 */
class CoreUsersSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = config('seeding.accounts');
        $created = [];

        foreach ($accounts as $role => $account) {
            $email = strtolower($account['email'] ?: $role.'@'.$this->domain());

            if (User::query()->where('email', $email)->exists()) {
                $this->command?->warn("{$email} already exists; skipped.");

                continue;
            }

            $password = config('seeding.password') ?: Str::password(16, symbols: false);
            $user = User::query()->forceCreate([
                'name' => $account['name'], 'email' => $email, 'password' => $password, 'email_verified_at' => now(), 'locale' => 'en',
                'account_type' => match ($role) {
                    'admin', 'verifier' => AccountType::Platform,
                    'client' => AccountType::Client,
                    default => AccountType::Lawyer,
                },
            ]);

            match ($role) {
                'admin' => $user->assignRole(PlatformRole::SuperAdmin->value),
                'verifier' => $user->assignRole(PlatformRole::VerificationOfficer->value),
                'lawyer' => $this->chambers($user),
                'firm' => $this->firm($user, $account['firm_name']),
                default => null,
            };

            $created[] = [$role, $email, config('seeding.password') ? '(SEED_PASSWORD)' : $password];
        }

        if ($created !== []) {
            $this->command?->table(['Account', 'Email', 'Password'], $created);
            $this->command?->warn('Save these passwords now; they are not shown again. Change them after the first sign in.');
        }
    }

    private function chambers(User $user): void
    {
        app(LawyerProfileService::class)->createFor($user);
        $organization = app(OrganizationProvisioner::class)->createSoloPractice($user);
        $user->forceFill(['current_organization_id' => $organization->id])->save();
    }

    private function firm(User $user, string $name): void
    {
        app(LawyerProfileService::class)->createFor($user);
        $organization = app(OrganizationProvisioner::class)->create($user, OrganizationType::Firm, $name);
        $user->forceFill(['current_organization_id' => $organization->id])->save();
    }

    /** SEED_EMAIL_DOMAIN, else the APP_URL host without "www.". */
    private function domain(): string
    {
        $host = config('seeding.email_domain') ?: (string) parse_url((string) config('app.url'), PHP_URL_HOST);

        return Str::after($host ?: 'example.com', 'www.');
    }
}
