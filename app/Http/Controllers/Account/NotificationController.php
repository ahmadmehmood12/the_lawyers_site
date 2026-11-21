<?php

namespace App\Http\Controllers\Account;

use App\Enums\NotificationChannel;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Models\User;
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
            'whatsappConsent' => $request->user()->hasWhatsAppConsent(),
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

    /** @return array<string, mixed> */
    public static function preferenceRules(): array
    {
        return [
            'preferences' => ['array'],
            'preferences.*.event' => ['required', Rule::in(self::EVENTS)],
            'preferences.*.channel' => ['required', Rule::enum(NotificationChannel::class)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ];
    }

    /**
     * Saves per-event channel switches (web and mobile API).
     *
     * @param  list<array{event: string, channel: string, enabled: bool}>  $preferences
     */
    public static function savePreferences(User $user, array $preferences): void
    {
        $canWhatsApp = $user->hasWhatsAppConsent();

        foreach ($preferences as $preference) {
            // WhatsApp per event switches only count after the account level opt in.
            if ($preference['channel'] === 'whatsapp' && $preference['enabled'] && ! $canWhatsApp) {
                $preference['enabled'] = false;
            }

            NotificationPreference::query()->updateOrCreate(
                ['user_id' => $user->id, 'event' => $preference['event'], 'channel' => $preference['channel']],
                ['enabled' => $preference['enabled']],
            );
        }
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        self::savePreferences($request->user(), $request->validate(self::preferenceRules())['preferences'] ?? []);

        return back()->with('success', __('Notification preferences saved.'));
    }
}
