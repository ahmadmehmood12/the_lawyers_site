<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\Access\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OrganizationSwitchController extends Controller
{
    public function __invoke(Request $request, Organization $organization, CurrentOrganization $current): RedirectResponse
    {
        abort_unless($current->switchTo($request->user(), $organization), 404);

        return redirect()->route('dashboard')->with('success', __('Switched to :name.', ['name' => $organization->name]));
    }
}
