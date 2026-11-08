<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Post-login landing: sends each account type to its own area. */
class HomeRedirectController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        return match (true) {
            $user->isPlatformStaff() => redirect()->route('admin.dashboard'),
            $user->isClient() => redirect()->route('portal.dashboard'),
            default => redirect()->route('dashboard'),
        };
    }
}
