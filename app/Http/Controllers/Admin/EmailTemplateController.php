<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Models\Setting;
use App\Support\EmailTemplateRegistry;
use App\Support\PublicFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin, Email templates (settings.manage): reword any notification email per language.
 * Without an active row the built-in, translated wording is used. The branded layout
 * (resources/views/mail/notification.blade.php) and the details table are not editable,
 * so required facts (date, court, links) can't be removed by mistake.
 */
class EmailTemplateController extends Controller
{
    public function index(): Response
    {
        $rows = EmailTemplate::query()->get()->groupBy('key');

        return Inertia::render('Admin/EmailTemplates', [
            'templates' => collect(EmailTemplateRegistry::all())->map(fn (array $meta, string $key) => [
                'key' => $key,
                ...$meta,
                'versions' => collect(['en', 'ur'])->mapWithKeys(fn ($language) => [$language => ($row = $rows->get($key)?->firstWhere('language', $language)) ? $row->only(['subject', 'heading', 'intro', 'outro', 'is_active']) : null]),
            ])->values(),
        ]);
    }

    public function save(Request $request, string $key): RedirectResponse
    {
        abort_unless(array_key_exists($key, EmailTemplateRegistry::all()), 404);
        $validated = $request->validate([
            'language' => ['required', Rule::in(['en', 'ur'])],
            'subject' => ['required', 'string', 'max:160'],
            'heading' => ['nullable', 'string', 'max:160'],
            'intro' => ['nullable', 'string', 'max:2000'],
            'outro' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ]);

        EmailTemplate::query()->updateOrCreate(['key' => $key, 'language' => $validated['language']], collect($validated)->except('language')->all());
        activity('admin')->causedBy($request->user())->withProperties(['key' => $key, 'language' => $validated['language']])->log('email_template_saved');

        return back()->with('success', __('Email template saved.'));
    }

    public function reset(Request $request, string $key, string $language): RedirectResponse
    {
        EmailTemplate::query()->where('key', $key)->where('language', $language)->delete();
        activity('admin')->causedBy($request->user())->withProperties(['key' => $key, 'language' => $language])->log('email_template_reset');

        return back()->with('success', __('Back to the built-in wording.'));
    }

    /** Renders the branded layout with this template's wording and sample values. */
    public function preview(Request $request, string $key): HttpResponse
    {
        $meta = EmailTemplateRegistry::all()[$key] ?? abort(404);
        $language = $request->query('language') === 'ur' ? 'ur' : 'en';
        $row = EmailTemplate::query()->where('key', $key)->where('language', $language)->first();
        $site = Setting::get('site_name') ?: (string) config('app.name');
        $sample = [':name' => 'Sana Malik', ':site' => $site, ':lawyer' => 'Ayesha Siddiqui', ':client' => 'Sana Malik', ':date' => now()->addDay()->setTime(17, 30)->translatedFormat('l, d F Y, h:i A'), ':status' => __('Confirmed'), ':case' => 'Sana Malik vs. Kamran Javed', ':court' => 'Family Courts Lahore', ':time' => '10:00', ':reference' => 'FB-2026-00012', ':subject' => __('Sample subject')];
        $fill = fn (?string $text) => $text ? strtr($text, $sample) : null;

        return response()->view('mail.notification', [
            'site' => $site,
            'logo' => PublicFile::url(Setting::get('site_logo_path')),
            'rtl' => $language === 'ur',
            'heading' => $fill($row?->heading) ?? $fill($row?->subject) ?? $meta['label'],
            'greeting' => __('Dear :name,', ['name' => 'Sana Malik']),
            'intro' => $row?->intro ? array_filter(explode("\n", $fill($row->intro))) : [__('Built-in wording is used until you save your own.')],
            'details' => [__('Lawyer') => 'Ayesha Siddiqui', __('Date and time') => $sample[':date'], __('Status') => __('Confirmed')],
            'action_label' => __('Open'),
            'action_url' => url('/'),
            'notice' => null,
            'outro' => $row?->outro ? array_filter(explode("\n", $fill($row->outro))) : [],
        ]);
    }
}
