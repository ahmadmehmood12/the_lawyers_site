<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\ReminderSetting;
use App\Rules\PakistaniPhone;
use App\Services\Access\OrganizationAccess;
use App\Services\Subscriptions\SubscriptionService;
use App\Services\WhatsApp\WhatsAppClient;
use App\Support\ImageReencoder;
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
            'organization' => [...$organization->only(['id', 'name', 'type', 'description', 'description_ur', 'email', 'phone', 'website', 'address', 'city_id', 'registration_number', 'ntn', 'founded_year', 'is_public', 'slug']), 'type' => $organization->type->value, 'logo_url' => $organization->logo_path ? Storage::disk('public')->url($organization->logo_path) : null],
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
        ]);
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

        return back()->with('success', __('Upgrade request recorded. Our team will contact you to complete payment for :plan.', ['plan' => $plan->name]));
    }
}
