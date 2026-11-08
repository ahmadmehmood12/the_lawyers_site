<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Support\ImageReencoder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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

    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:min_width=100,min_height=100,max_width=5000,max_height=5000'],
        ]);

        $path = ImageReencoder::squareJpeg($request->file('avatar'), 'avatars');
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => $path]);
        activity('account')->causedBy($user)->performedOn($user)->log('avatar_updated');

        return back()->with('success', __('Profile photo updated.'));
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
            activity('account')->causedBy($user)->performedOn($user)->log('avatar_removed');
        }

        return back()->with('success', __('Profile photo removed.'));
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
