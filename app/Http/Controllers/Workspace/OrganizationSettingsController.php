<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AppointmentStatus;
use App\Enums\HearingStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Hearing;
use App\Models\NotificationDelivery;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\ReminderSetting;
use App\Rules\PakistaniPhone;
use App\Services\Access\OrganizationAccess;
use App\Services\Subscriptions\SubscriptionService;
use App\Services\WhatsApp\WhatsAppClient;
use App\Support\ImageReencoder;
use App\Support\PublicFile;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Organization profile, reminder schedule and subscription (docs/Modules/Law-Firms.md). */
class OrganizationSettingsController extends Controller
{
    private function canManage(Request $request): bool
    {
        return app(OrganizationAccess::class)->allows($request->user(), $this->organization(), 'organization.settings');
    }

    public function show(Request $request, SubscriptionService $subscriptions): Response
    {
        $organization = $this->organization()->load('city:id,name');
        $subscription = $organization->activeSubscription()->with('plan.features')->first();
        $plan = $subscriptions->planFor($organization);
        $reminders = ReminderSetting::query()->forOrganization($organization)->orderBy('event')->orderByDesc('days_before')->get(['event', 'days_before', 'notify_lawyer', 'notify_client']);

        return Inertia::render('Workspace/Settings/Organization', [
            'organization' => [...$organization->only(['id', 'name', 'type', 'description', 'description_ur', 'email', 'phone', 'website', 'address', 'city_id', 'registration_number', 'ntn', 'founded_year', 'is_public', 'slug']), 'type' => $organization->type->value, 'logo_url' => PublicFile::url($organization->logo_path)],
            'canManage' => $this->canManage($request),
            'reminders' => $reminders->isEmpty()
                ? collect(config('legal.default_reminders'))->flatMap(fn ($days, $event) => collect($days)->map(fn ($d) => ['event' => $event, 'days_before' => $d, 'notify_lawyer' => true, 'notify_client' => true]))->values()
                : $reminders,
            'subscription' => [
                'plan' => $plan ? ['slug' => $plan->slug, 'name' => $plan->name, 'features' => $plan->features->map(fn ($f) => ['label' => $f->feature->label(), 'limit' => $f->limit_value])] : null,
                'status' => $subscription?->status->label(),
                'ends_at' => $subscription?->ends_at?->toDateString(),
                'trial_ends_at' => $subscription?->trial_ends_at?->toDateString(),
            ],
            'plans' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get(['slug', 'name', 'price_monthly', 'price_yearly', 'audience']),
            'cities' => ReferenceOptions::cities(),
            'whatsappConfigured' => app(WhatsAppClient::class)->isConfigured(),
            'reminderStats' => $this->reminderStats($organization, $reminders->isEmpty()
                ? collect(config('legal.default_reminders'))->flatMap(fn ($days, $event) => collect($days)->map(fn ($d) => ['event' => $event, 'days_before' => $d]))
                : $reminders->map(fn ($r) => ['event' => $r->event, 'days_before' => $r->days_before])),
        ]);
    }

    /**
     * Real figures for each reminder rule in the Reminder schedule table: how many items the
     * next 07:00 run will remind about, and when this rule last sent (from the job's claim rows
     * in notification_deliveries). Payment reminders are configurable but not dispatched yet.
     *
     * @param  iterable<array{event: string, days_before: int}>  $rules
     * @return array<string, array{next_run: string, due: int|null, last_sent: string|null, last_count: int}>
     */
    private function reminderStats(Organization $organization, iterable $rules): array
    {
        $now = now();
        $run = $now->hour < 7 ? $now->copy()->startOfDay() : $now->copy()->addDay()->startOfDay();
        $stats = [];

        foreach ($rules as $rule) {
            $key = $rule['event'].':'.$rule['days_before'];
            if (isset($stats[$key])) {
                continue;
            }
            $target = $run->copy()->addDays((int) $rule['days_before'])->toDateString();
            $due = match ($rule['event']) {
                'hearing' => Hearing::query()->forOrganization($organization)->where('status', HearingStatus::Scheduled->value)->whereDate('hearing_date', $target)->count(),
                'appointment' => Appointment::query()->forOrganization($organization)->where('status', AppointmentStatus::Confirmed->value)->whereDate('starts_at', $target)->count(),
                default => null,
            };
            $last = in_array($rule['event'], ['hearing', 'appointment'], true)
                ? NotificationDelivery::query()->where('organization_id', $organization->id)->where('event', $rule['event'].'_reminder')
                    ->where('dedupe_key', 'like', 'reminder:'.$rule['event'].':%:'.(int) $rule['days_before'])
                    ->selectRaw('DATE(MAX(sent_at)) as day')->value('day')
                : null;

            $stats[$key] = [
                'next_run' => $run->copy()->setTime(7, 0)->toIso8601String(),
                'due' => $due,
                'last_sent' => $last,
                'last_count' => $last ? NotificationDelivery::query()->where('organization_id', $organization->id)->where('event', $rule['event'].'_reminder')
                    ->where('dedupe_key', 'like', 'reminder:'.$rule['event'].':%:'.(int) $rule['days_before'])->whereDate('sent_at', $last)->count() : 0,
            ];
        }

        return $stats;
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'description_ur' => ['nullable', 'string', 'max:5000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', new PakistaniPhone],
            'website' => ['nullable', 'url:https,http', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'registration_number' => ['nullable', 'string', 'max:60'],
            'ntn' => ['nullable', 'string', 'max:30'],
            'founded_year' => ['nullable', 'integer', 'between:1900,'.now()->year],
            'is_public' => ['boolean'],
        ]);
        $validated['phone'] = PakistaniPhone::normalize($validated['phone'] ?? null);

        $this->organization()->update($validated);

        return back()->with('success', __('Organization details saved.'));
    }

    /** Logo shown on the public firm page, directory cards and the workspace header. */
    public function updateLogo(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $request->validate(['logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=64,min_height=64,max_width=5000,max_height=5000']]);
        $organization = $this->organization();

        if ($organization->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
        }

        $organization->update(['logo_path' => ImageReencoder::fittedPng($request->file('logo'), 'organization-logos')]);
        activity('organization')->causedBy($request->user())->performedOn($organization)->log('logo_updated');

        return back()->with('success', __('Logo updated.'));
    }

    public function removeLogo(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $organization = $this->organization();

        if ($organization->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
            $organization->update(['logo_path' => null]);
            activity('organization')->causedBy($request->user())->performedOn($organization)->log('logo_removed');
        }

        return back()->with('success', __('Logo removed.'));
    }

    public function updateReminders(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $validated = $request->validate([
            'reminders' => ['array', 'max:20'],
            'reminders.*.event' => ['required', Rule::in(['hearing', 'appointment', 'payment'])],
            'reminders.*.days_before' => ['required', 'integer', 'between:0,30'],
            'reminders.*.notify_lawyer' => ['boolean'],
            'reminders.*.notify_client' => ['boolean'],
        ]);
        $organization = $this->organization();

        ReminderSetting::query()->forOrganization($organization)->delete();
        foreach (collect($validated['reminders'] ?? [])->unique(fn ($r) => $r['event'].':'.$r['days_before']) as $row) {
            $organization->reminderSettings()->create($row);
        }

        return back()->with('success', __('Reminder schedule saved.'));
    }

    /**
     * Plan changes: free plans apply immediately. Paid plans require a verified
     * payment through the configured gateway, which is pending credentials — the
     * request is recorded for the finance team instead of being granted.
     */
    public function changePlan(Request $request, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($this->canManage($request), 403);
        $plan = Plan::query()->where('is_active', true)->where('slug', $request->validate(['plan' => ['required', 'string']])['plan'])->firstOrFail();

        if ($plan->price_monthly === 0) {
            $subscriptions->start($this->organization(), $plan);

            return back()->with('success', __('Plan changed to :plan.', ['plan' => $plan->name]));
        }

        activity('billing')->causedBy($request->user())->performedOn($this->organization())->withProperties(['plan' => $plan->slug])->log('plan_change_requested');

        return redirect()->route('billing.index')->with('success', __('Choose a payment method to complete the upgrade to :plan.', ['plan' => $plan->name]));
    }
}
