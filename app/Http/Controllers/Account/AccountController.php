<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Personal account: profile (Fortify updates it), password, 2FA, sessions,
 * and account deletion requests. Legal records are never hard-deleted here —
 * a deletion request is reviewed by support (docs/Security/Data-Privacy.md).
 */
class AccountController extends Controller
{
    public function edit(Request $request): Response
    {
        $sessions = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(fn ($s) => [
                'id' => hash('sha256', $s->id),
                'ip_address' => $s->ip_address,
                'agent' => mb_strimwidth((string) $s->user_agent, 0, 90, '…'),
                'last_active' => date(DATE_ATOM, $s->last_activity),
                'current' => $s->id === $request->session()->getId(),
            ]);

        return Inertia::render('Account/Edit', [
            'sessions' => $sessions,
            'deletionRequestedAt' => $request->user()->deletion_requested_at?->toIso8601String(),
            'area' => $request->user()->isClient() ? 'portal' : ($request->user()->isPlatformStaff() ? 'admin' : 'workspace'),
        ]);
    }

    public function logoutOtherSessions(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        Auth::logoutOtherDevices($request->string('password')->toString());
        DB::table('sessions')->where('user_id', $request->user()->id)->where('id', '!=', $request->session()->getId())->delete();

        return back()->with('success', __('Signed out of all other sessions.'));
    }

    public function requestDeletion(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $request->user()->forceFill(['deletion_requested_at' => now()])->save();
        activity('account')->causedBy($request->user())->performedOn($request->user())->log('deletion_requested');

        return back()->with('success', __('Your deletion request has been received. Our team will contact you.'));
    }

    public function cancelDeletion(Request $request): RedirectResponse
    {
        $request->user()->forceFill(['deletion_requested_at' => null])->save();

        return back()->with('success', __('Deletion request cancelled.'));
    }
}
