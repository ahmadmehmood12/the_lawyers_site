<?php

/*
|--------------------------------------------------------------------------
| Production seeding (database/seeders/ProductionSeeder.php)
|--------------------------------------------------------------------------
| The starting accounts created by CoreUsersSeeder. Set these in .env before
| running `php artisan db:seed --class=ProductionSeeder`. Blank emails become
| role@<your domain> (from APP_URL); a blank password gives each account its own
| random password, printed once in the console. Change them after first login.
*/

return [
    'email_domain' => env('SEED_EMAIL_DOMAIN'),
    'password' => env('SEED_PASSWORD'),
    'support_email' => env('SEED_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),

    'accounts' => [
        'admin' => ['name' => env('SEED_ADMIN_NAME', 'Platform Admin'), 'email' => env('SEED_ADMIN_EMAIL')],
        'verifier' => ['name' => env('SEED_VERIFIER_NAME', 'Verification Officer'), 'email' => env('SEED_VERIFIER_EMAIL')],
        'lawyer' => ['name' => env('SEED_LAWYER_NAME', 'Advocate'), 'email' => env('SEED_LAWYER_EMAIL')],
        'firm' => ['name' => env('SEED_FIRM_OWNER_NAME', 'Law Firm Owner'), 'email' => env('SEED_FIRM_EMAIL'), 'firm_name' => env('SEED_FIRM_NAME', 'Da Barrister Law Associates')],
        'client' => ['name' => env('SEED_CLIENT_NAME', 'Client'), 'email' => env('SEED_CLIENT_EMAIL')],
    ],
];
