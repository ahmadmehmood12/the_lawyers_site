<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Models\NotificationDelivery;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\WhatsAppTemplate;
use App\Services\Ai\AiProvider;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/** Plans, notification configuration, platform settings and audit log. */
class PlatformController extends Controller
{
    /** Keys editable from Admin → Settings. Secrets live in .env only. */
    public const SETTINGS = ['default_plan', 'support_email', 'ai_enabled', 'ai_redact_personal_data', 'reviews_require_moderation'];

    public function plans(): Response
    {
        return Inertia::render('Admin/Plans', [
            'plans' => Plan::query()->with('features')->orderBy('sort_order')->get()->map(fn (Plan $p) => [
                ...$p->only(['id', 'slug', 'name', 'name_ur', 'audience', 'description', 'price_monthly', 'price_yearly', 'trial_days', 'is_active', 'sort_order']),
                'features' => collect(PlanFeature::cases())->mapWithKeys(fn ($f) => [$f->value => $p->features->firstWhere('feature', $f)?->limit_value ?? 0])->all(),
            ]),
            'features' => PlanFeature::options(),
            'subscriptions' => Subscription::query()->with(['organization:id,name', 'plan:id,name'])->latest()->limit(50)->get()
                ->map(fn ($s) => ['id' => $s->id, 'organization' => $s->organization->name, 'plan' => $s->plan->name, 'status' => $s->status->value, 'status_label' => $s->status->label(), 'starts_at' => $s->starts_at->toDateString(), 'ends_at' => $s->ends_at?->toDateString()]),
        ]);
    }

    public function savePlan(Request $request, ?Plan $plan = null): RedirectResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'alpha_dash', 'max:40', Rule::unique('plans', 'slug')->ignore($plan?->id)],
            'name' => ['required', 'string', 'max:120'], 'name_ur' => ['nullable', 'string', 'max:120'],
            'audience' => ['required', Rule::in(['lawyer', 'firm'])], 'description' => ['nullable', 'string', 'max:500'],
            'price_monthly' => ['required', 'integer', 'min:0'], 'price_yearly' => ['required', 'integer', 'min:0'],
            'trial_days' => ['required', 'integer', 'between:0,90'], 'is_active' => ['boolean'], 'sort_order' => ['integer', 'min:0'],
            'features' => ['array'], 'features.*' => ['nullable', 'integer', 'min:0'],
        ]);
        $plan ??= new Plan;
        $plan->fill(collect($validated)->except('features')->all())->save();

        foreach (PlanFeature::cases() as $feature) {
            if (array_key_exists($feature->value, $validated['features'] ?? [])) {
                $plan->features()->updateOrCreate(['feature' => $feature->value], ['limit_value' => $validated['features'][$feature->value]]);
            }
        }
        activity('billing')->causedBy($request->user())->performedOn($plan)->log('plan_saved');

        return back()->with('success', __('Plan saved.'));
    }

    public function notifications(Request $request): Response
    {
        return Inertia::render('Admin/Notifications', [
            'templates' => WhatsAppTemplate::query()->orderBy('key')->orderBy('language')->get(),
            'deliveries' => NotificationDelivery::query()->where('channel', '!=', 'in_app')
                ->when($request->string('status')->toString(), fn ($q, $s) => $q->where('status', $s))
                ->latest('id')->paginate(30)->withQueryString()
                ->through(fn ($d) => ['id' => $d->id, 'channel' => $d->channel->value, 'event' => $d->event, 'recipient' => substr($d->recipient, 0, 5).'••••'.substr($d->recipient, -2), 'template' => $d->template, 'status' => $d->status->value, 'attempts' => $d->attempts, 'error' => $d->error, 'created_at' => $d->created_at->toIso8601String()]),
            'configured' => app(WhatsAppClient::class)->isConfigured(),
            'filters' => $request->only('status'),
        ]);
    }

    public function saveWhatsAppTemplate(Request $request, ?WhatsAppTemplate $template = null): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'alpha_dash', 'max:60'], 'name' => ['required', 'string', 'max:120'], 'language' => ['required', Rule::in(['en', 'ur'])],
            'body_preview' => ['required', 'string', 'max:1024'], 'variable_count' => ['required', 'integer', 'between:0,10'],
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'disabled'])],
        ]);
        ($template ?? new WhatsAppTemplate)->fill([...$validated, 'category' => 'utility'])->save();

        return back()->with('success', __('WhatsApp template saved.'));
    }

    public function settings(): Response
    {
        return Inertia::render('Admin/Settings', [
            'settings' => collect(self::SETTINGS)->mapWithKeys(fn ($k) => [$k => Setting::get($k)]),
            'plans' => Plan::query()->orderBy('sort_order')->get(['slug', 'name'])->map(fn ($p) => ['value' => $p->slug, 'label' => $p->name]),
            'env' => [
                'whatsapp' => app(WhatsAppClient::class)->isConfigured(),
                'ai' => app(AiProvider::class)->isEnabled(),
                'ai_model' => config('services.ai.model'),
                'payments' => filled(config('services.payments.gateway')),
                'mail' => config('mail.default'),
                'queue' => config('queue.default'),
            ],
        ]);
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_plan' => ['required', 'exists:plans,slug'], 'support_email' => ['required', 'email'],
            'ai_enabled' => ['required', Rule::in(['0', '1'])], 'ai_redact_personal_data' => ['required', Rule::in(['0', '1'])],
            'reviews_require_moderation' => ['required', Rule::in(['0', '1'])],
        ]);
        foreach ($validated as $key => $value) {
            Setting::put($key, (string) $value);
        }
        activity('admin')->causedBy($request->user())->withProperties($validated)->log('settings_changed');

        return back()->with('success', __('Settings saved.'));
    }

    /** Audit log: who did what, when. Property values shown are change sets, not case content. */
    public function audit(Request $request): Response
    {
        return Inertia::render('Admin/Audit', [
            'activities' => Activity::query()->with('causer:id,name')
                ->when($request->string('log')->toString(), fn ($q, $l) => $q->where('log_name', $l))
                ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('description', 'like', "%{$s}%"))
                ->latest('id')->paginate(50)->withQueryString()
                ->through(fn ($a) => ['id' => $a->id, 'log' => $a->log_name, 'description' => $a->description, 'subject' => $a->subject_type ? class_basename($a->subject_type).' #'.$a->subject_id : null, 'causer' => $a->causer?->name, 'properties' => in_array($a->log_name, ['cases', 'hearings'], true) ? ['fields' => array_keys((array) ($a->properties['attributes'] ?? []))] : $a->properties, 'created_at' => $a->created_at->toIso8601String()]),
            'logs' => Activity::query()->distinct()->pluck('log_name'),
            'filters' => $request->only(['log', 'search']),
        ]);
    }
}
