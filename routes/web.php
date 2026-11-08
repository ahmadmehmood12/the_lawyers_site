<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Route map (docs/Architecture/Backend-Architecture.md#routes)
|--------------------------------------------------------------------------
| public.php    — marketing site, directory, articles (indexable)
| account.php   — authenticated, any account type
| workspace.php — lawyers & firm staff (middleware: workspace)
| portal.php    — clients (prefix /portal)
| admin.php     — platform staff (prefix /admin, Spatie permissions)
*/

require __DIR__.'/web/public.php';
require __DIR__.'/web/account.php';
require __DIR__.'/web/workspace.php';

foreach (['portal', 'admin'] as $file) {
    if (is_file(__DIR__."/web/{$file}.php")) {
        require __DIR__."/web/{$file}.php";
    }
}
