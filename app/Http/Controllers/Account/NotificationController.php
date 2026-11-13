<?php

namespace App\Http\Controllers\Account;

use App\Enums\NotificationChannel;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /** @var list<string> */
    public const EVENTS = ['hearing_reminder', 'hearing_update', 'appointment', 'payment', 'message', 'case_update', 'document_request', 'article_update', 'review'];

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Account/Notifications', [
            'notifications' => $user->notifications()->latest()->paginate(20)->through(fn ($n) => [
                'id' => $n->id,
                'data' => $n->data,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->toIso8601String(),
            ]),
            'preferences' => $user->notificationPreferences()->get(['event', 'channel', 'enabled']),
            'events' => self::EVENTS,
            'channels' => NotificationChannel::options(),
            'area' => $user->isClient() ? 'portal' : ($user->isPlatformStaff() ? 'admin' : 'workspace'),
        ]);
    }

    public function read(Request $request, string $id): RedirectResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        $url = $notification->data['url'] ?? null;

        return $url && str_starts_with($url, url('/')) ? redirect($url) : back();
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preferences' => ['array'],
            'preferences.*.event' => ['required', Rule::in(self::EVENTS)],
            'preferences.*.channel' => ['required', Rule::enum(NotificationChannel::class)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ]);

        foreach ($validated['preferences'] ?? [] as $preference) {
            NotificationPreference::query()->updateOrCreate(
                ['user_id' => $request->user()->id, 'event' => $preference['event'], 'channel' => $preference['channel']],
                ['enabled' => $preference['enabled']],
            );
        }

        return back()->with('success', __('Notification preferences saved.'));
    }
}
