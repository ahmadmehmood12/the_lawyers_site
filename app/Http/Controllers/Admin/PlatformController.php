<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\NotificationDelivery;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\WhatsAppTemplate;
use App\Services\Ai\AiProvider;
use App\Services\Mail\MailSettings;
use App\Services\WhatsApp\WhatsAppClient;
use App\Support\ActivityPresenter;
use App\Support\PublicFile;
use App\Support\Typography;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Plans, notification configuration, platform settings and audit log. */
class PlatformController extends Controller
{
    /** Keys editable from Admin → Settings. Secret values are never returned to the browser. */
    public const SETTINGS = ['default_plan', 'support_email', 'ai_enabled', 'ai_redact_personal_data', 'reviews_require_moderation', 'site_theme'];

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
                ->when($request->string('channel')->toString(), fn ($q, $c) => $q->where('channel', $c))
                ->when($request->string('event')->trim()->toString(), fn ($q, $e) => $q->where('event', 'like', "%{$e}%"))
                ->latest('id')->paginate(30)->withQueryString()
                ->through(fn ($d) => ['id' => $d->id, 'channel' => $d->channel->value, 'event' => $d->event, 'recipient' => substr($d->recipient, 0, 5).'••••'.substr($d->recipient, -2), 'template' => $d->template, 'status' => $d->status->value, 'attempts' => $d->attempts, 'error' => $d->error, 'created_at' => $d->created_at->toIso8601String()]),
            'configured' => app(WhatsAppClient::class)->isConfigured(),
            'enabled' => app(WhatsAppClient::class)->isEnabled(),
            'displayName' => app(WhatsAppClient::class)->displayName(),
            'settingsUrl' => route('admin.settings.edit'),
            'filters' => $request->only(['status', 'channel', 'event']),
            // Totals per channel and status for the log header (email + WhatsApp; in-app excluded).
            'totals' => NotificationDelivery::query()->where('channel', '!=', 'in_app')->selectRaw('channel, status, count(*) as total')->groupBy('channel', 'status')->get()
                ->map(fn ($r) => ['channel' => $r->channel instanceof \BackedEnum ? $r->channel->value : $r->channel, 'status' => $r->status instanceof \BackedEnum ? $r->status->value : $r->status, 'total' => (int) $r->total]),
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
            'whatsapp' => $this->whatsAppSettings(),
            'mail' => app(MailSettings::class)->values(),
            'branding' => $this->brandingSettings(),
            'authMedia' => self::authMedia(),
            'typography' => Typography::adminPayload(),
            'env' => [
                'ai' => app(AiProvider::class)->isEnabled(),
                'ai_model' => config('services.ai.model'),
                'payments' => filled(config('services.payments.gateway')),
                'mail' => config('mail.default'),
                'queue' => config('queue.default'),
            ],
        ]);
    }

    /** @return array{enabled: bool, display_name: string, phone_number_id: string, api_version: string, configured: bool, has_token: bool, has_app_secret: bool, has_verify_token: bool, webhook_url: string} */
    private function whatsAppSettings(): array
    {
        return [
            'enabled' => Setting::get('whatsapp_enabled', '1') === '1',
            'display_name' => Setting::get('whatsapp_display_name') ?: config('app.name'),
            'phone_number_id' => (string) Setting::get('whatsapp_phone_number_id', ''),
            'api_version' => Setting::get('whatsapp_api_version') ?: config('services.whatsapp.api_version'),
            'configured' => app(WhatsAppClient::class)->isConfigured(),
            'has_token' => filled(Setting::getSecret('whatsapp_token')) || filled(config('services.whatsapp.token')),
            'has_app_secret' => filled(Setting::getSecret('whatsapp_app_secret')) || filled(config('services.whatsapp.app_secret')),
            'has_verify_token' => filled(Setting::getSecret('whatsapp_verify_token')) || filled(config('services.whatsapp.verify_token')),
            'webhook_url' => url('/api/webhooks/whatsapp'),
        ];
    }

    /** Saves WhatsApp Business Cloud API credentials from the admin panel. */
    public function saveWhatsAppSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', Rule::in(['0', '1'])],
            'display_name' => ['required', 'string', 'max:60'],
            'phone_number_id' => ['nullable', 'string', 'max:60'],
            'api_version' => ['required', 'string', 'max:20', 'regex:/^v\d+\.\d+$/'],
            'token' => ['nullable', 'string', 'max:1000'],
            'app_secret' => ['nullable', 'string', 'max:1000'],
            'verify_token' => ['nullable', 'string', 'max:255'],
            'clear_token' => ['boolean'],
            'clear_app_secret' => ['boolean'],
            'clear_verify_token' => ['boolean'],
        ]);

        Setting::put('whatsapp_enabled', $validated['enabled']);
        Setting::put('whatsapp_display_name', trim($validated['display_name']));
        Setting::put('whatsapp_phone_number_id', trim((string) ($validated['phone_number_id'] ?? '')) ?: null);
        Setting::put('whatsapp_api_version', trim($validated['api_version']));

        foreach (['token' => 'whatsapp_token', 'app_secret' => 'whatsapp_app_secret', 'verify_token' => 'whatsapp_verify_token'] as $field => $key) {
            if ($request->boolean("clear_{$field}")) {
                Setting::putSecret($key, null);
            } elseif (filled($validated[$field] ?? null)) {
                Setting::putSecret($key, $validated[$field]);
            }
        }

        activity('admin')->causedBy($request->user())
            ->withProperties(collect($validated)->except(['token', 'app_secret', 'verify_token'])->all())
            ->log('whatsapp_settings_changed');

        return back()->with('success', __('WhatsApp settings saved.'));
    }

    /** @return array<string, mixed> */
    private function brandingSettings(): array
    {
        $logo = Setting::get('site_logo_path');
        $favicon = Setting::get('site_favicon_path');

        return [
            'site_name' => Setting::get('site_name') ?: config('app.name'),
            'site_tagline' => Setting::get('site_tagline') ?: '',
            'logo_url' => PublicFile::url($logo),
            'favicon_url' => PublicFile::url($favicon),
            'social' => [
                'facebook' => Setting::get('social_facebook') ?: '',
                'instagram' => Setting::get('social_instagram') ?: '',
                'youtube' => Setting::get('social_youtube') ?: '',
                'linkedin' => Setting::get('social_linkedin') ?: '',
                'x' => Setting::get('social_x') ?: '',
                'whatsapp' => Setting::get('social_whatsapp') ?: '',
            ],
            'contact' => [
                'email' => Setting::get('contact_email') ?: '',
                'phone' => Setting::get('contact_phone') ?: '',
                'address' => Setting::get('contact_address') ?: '',
            ],
        ];
    }

    /** Saves the public brand name, logo/favicon, social profile links and footer contact details. */
    public function saveBrandingSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:60'],
            'site_tagline' => ['nullable', 'string', 'max:160'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp,ico', 'max:512'],
            'remove_logo' => ['boolean'],
            'remove_favicon' => ['boolean'],
            'social_facebook' => ['nullable', 'url:https,http', 'max:255'],
            'social_instagram' => ['nullable', 'url:https,http', 'max:255'],
            'social_youtube' => ['nullable', 'url:https,http', 'max:255'],
            'social_linkedin' => ['nullable', 'url:https,http', 'max:255'],
            'social_x' => ['nullable', 'url:https,http', 'max:255'],
            'social_whatsapp' => ['nullable', 'url:https,http', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-\s]+$/'],
            'contact_address' => ['nullable', 'string', 'max:255'],
        ]);

        Setting::put('site_name', trim($validated['site_name']));
        Setting::put('site_tagline', filled($validated['site_tagline'] ?? null) ? trim($validated['site_tagline']) : null);

        foreach (['facebook', 'instagram', 'youtube', 'linkedin', 'x', 'whatsapp'] as $network) {
            Setting::put('social_'.$network, filled($validated['social_'.$network] ?? null) ? trim($validated['social_'.$network]) : null);
        }

        foreach (['contact_email', 'contact_phone', 'contact_address'] as $key) {
            Setting::put($key, filled($validated[$key] ?? null) ? trim($validated[$key]) : null);
        }

        foreach (['logo' => 'site_logo_path', 'favicon' => 'site_favicon_path'] as $field => $key) {
            if ($request->boolean('remove_'.$field)) {
                if ($old = Setting::get($key)) {
                    Storage::disk('public')->delete($old);
                }
                Setting::put($key, null);
            }

            if ($request->hasFile($field)) {
                if ($old = Setting::get($key)) {
                    Storage::disk('public')->delete($old);
                }
                Setting::put($key, $request->file($field)->store('branding', 'public'));
            }
        }

        activity('admin')->causedBy($request->user())->withProperties(collect($validated)->except(['logo', 'favicon'])->all())->log('branding_settings_changed');

        return back()->with('success', __('Branding saved.'));
    }

    /**
     * Promotional panel on the sign-in / sign-up pages (also shared to those pages).
     *
     * @return array{enabled: bool, mode: string, image_url: string|null, video_url: string|null, poster_url: string|null, heading: string, description: string, heading_ur: string, description_ur: string, default_image: string}
     */
    public static function authMedia(): array
    {
        return [
            'enabled' => Setting::get('auth_media_enabled', '1') === '1',
            'mode' => Setting::get('auth_media_mode') === 'video' ? 'video' : 'image',
            'image_url' => PublicFile::url(Setting::get('auth_media_image_path')),
            'video_url' => PublicFile::url(Setting::get('auth_media_video_path')),
            'poster_url' => PublicFile::url(Setting::get('auth_media_poster_path')),
            'heading' => Setting::get('auth_media_heading') ?: 'Every hearing on record. Every date kept.',
            'description' => Setting::get('auth_media_description') ?: 'Court diary, case files, drafting and client updates for advocates and law firms across Pakistan.',
            'heading_ur' => Setting::get('auth_media_heading_ur') ?: '',
            'description_ur' => Setting::get('auth_media_description_ur') ?: '',
            'default_image' => asset('images/screens/dashboard.webp'),
        ];
    }

    /** Saves the sign-in page media: image or short muted video, with a still fallback. */
    public function saveAuthMediaSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', Rule::in(['0', '1'])],
            'mode' => ['required', Rule::in(['image', 'video'])],
            'heading' => ['nullable', 'string', 'max:90'],
            'description' => ['nullable', 'string', 'max:240'],
            'heading_ur' => ['nullable', 'string', 'max:120'],
            'description_ur' => ['nullable', 'string', 'max:300'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096', 'dimensions:min_width=800,min_height=600'],
            'video' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm', 'max:20480'],
            'poster' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['boolean'],
            'remove_video' => ['boolean'],
            'remove_poster' => ['boolean'],
        ]);

        foreach (['enabled', 'mode', 'heading', 'description', 'heading_ur', 'description_ur'] as $key) {
            Setting::put('auth_media_'.$key, filled($validated[$key] ?? null) ? trim((string) $validated[$key]) : null);
        }

        foreach (['image', 'video', 'poster'] as $field) {
            $key = 'auth_media_'.$field.'_path';
            if ($request->boolean('remove_'.$field) || $request->hasFile($field)) {
                if ($old = Setting::get($key)) {
                    Storage::disk('public')->delete($old);
                }
                Setting::put($key, $request->hasFile($field) ? $request->file($field)->store('auth-media', 'public') : null);
            }
        }

        if ($validated['mode'] === 'video' && ! Setting::get('auth_media_video_path')) {
            return back()->with('error', __('Saved, but no video is uploaded yet, so the sign-in page shows the image instead.'));
        }

        activity('admin')->causedBy($request->user())->withProperties(collect($validated)->except(['image', 'video', 'poster'])->all())->log('auth_media_changed');

        return back()->with('success', __('Sign-in page media saved.'));
    }

    /** Saves SMTP settings; blank values fall back to the server environment. */
    public function saveMailSettings(Request $request, MailSettings $mail): RedirectResponse
    {
        $validated = $request->validate([
            'mail_mailer' => ['required', Rule::in(['smtp', 'log', 'array', 'failover', 'roundrobin', 'sendmail', 'ses', 'postmark', 'resend', 'mailgun'])],
            'mail_scheme' => ['nullable', Rule::in(['smtp', 'smtps'])],
            'mail_host' => ['nullable', 'string', 'max:255'],
            'mail_port' => ['nullable', 'integer', 'between:1,65535'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:1000'],
            'mail_from_address' => ['nullable', 'email', 'max:255'],
            'mail_from_name' => ['nullable', 'string', 'max:120'],
            'clear_password' => ['boolean'],
        ]);

        foreach (['mail_mailer', 'mail_scheme', 'mail_host', 'mail_port', 'mail_username', 'mail_from_address', 'mail_from_name'] as $key) {
            $value = $validated[$key] ?? null;
            Setting::put($key, filled($value) ? (string) $value : null);
        }

        if ($request->boolean('clear_password')) {
            Setting::putSecret('mail_password', null);
        } elseif (filled($validated['mail_password'] ?? null)) {
            Setting::putSecret('mail_password', $validated['mail_password']);
        }

        $mail->apply();
        activity('admin')->causedBy($request->user())->withProperties(collect($validated)->except('mail_password')->all())->log('mail_settings_changed');

        return back()->with('success', __('Mail settings saved.'));
    }

    /** Sends a plain test message with the saved mail settings and reports the real outcome. */
    public function sendTestMail(Request $request, MailSettings $mail): RedirectResponse
    {
        $validated = $request->validate(['to' => ['required', 'email', 'max:255']]);
        $mail->apply();

        try {
            Mail::raw(__('This is a test message from :site. If you can read it, outgoing mail works.', ['site' => Setting::get('site_name') ?: config('app.name')]), function ($message) use ($validated): void {
                $message->to($validated['to'])->subject(__('Test email'));
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', __('The test email could not be sent: :reason', ['reason' => Str::limit($e->getMessage(), 180)]));
        }

        activity('admin')->causedBy($request->user())->withProperties(['to' => $validated['to'], 'mailer' => config('mail.default')])->log('mail_test_sent');

        return back()->with('success', config('mail.default') === 'log'
            ? __('Test email written to the log. Switch the mailer to SMTP to deliver real email.')
            : __('Test email handed to the mail server. Check the inbox of :to.', ['to' => $validated['to']]));
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_plan' => ['required', 'exists:plans,slug'], 'support_email' => ['required', 'email'],
            'ai_enabled' => ['required', Rule::in(['0', '1'])], 'ai_redact_personal_data' => ['required', Rule::in(['0', '1'])],
            'reviews_require_moderation' => ['required', Rule::in(['0', '1'])],
            'site_theme' => ['required', Rule::in(['navy-gold', 'white-green'])],
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
            'activities' => ActivityPresenter::eagerLoad(Activity::query())
                ->with('organization:id,name')
                ->when($request->string('log')->toString(), fn ($q, $l) => $q->where('log_name', $l))
                ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where(fn ($w) => $w->where('description', 'like', "%{$s}%")->orWhere('ip_address', 'like', "{$s}%")))
                ->latest('id')->paginate(50)->withQueryString()
                ->through(fn ($a) => [
                    ...ActivityPresenter::present($a, 'platform'),
                    'description' => $a->description,
                    'subject' => $a->subject_type ? class_basename($a->subject_type).' #'.$a->subject_id : null,
                    'causer' => $a->causer?->name,
                    'organization' => $a->organization?->name,
                    'properties' => in_array($a->log_name, ['cases', 'hearings', 'clients', 'tasks', 'documents', 'drafts'], true) ? ['fields' => array_keys((array) ($a->properties['attributes'] ?? []))] : $a->properties,
                ]),
            'logs' => Activity::query()->distinct()->pluck('log_name'),
            'filters' => $request->only(['log', 'search']),
        ]);
    }
}
