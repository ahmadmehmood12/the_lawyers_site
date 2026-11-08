<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Page;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CMS pages (about, terms, privacy, faqs, resources) are editable in the admin
 * panel (pages table). Pricing reads live plan data.
 */
class PageController extends Controller
{
    public function show(string $slug): Response
    {
        $page = Page::query()->where('slug', $slug)->where('is_published', true)->firstOrFail();
        $ur = app()->getLocale() === 'ur';

        return Inertia::render('Public/Page', [
            'page' => [
                'slug' => $page->slug,
                'title' => $ur && $page->title_ur ? $page->title_ur : $page->title,
                'body' => $ur && $page->body_ur ? $page->body_ur : $page->body,
                'meta_description' => $page->meta_description,
                'updated_at' => $page->updated_at->toDateString(),
            ],
            'canonical' => url($slug),
        ]);
    }

    public function pricing(): Response
    {
        return Inertia::render('Public/Pricing', [
            'plans' => Plan::query()->where('is_active', true)->with('features')->orderBy('sort_order')->get()->map(fn (Plan $p) => [
                'slug' => $p->slug,
                'name' => app()->getLocale() === 'ur' && $p->name_ur ? $p->name_ur : $p->name,
                'description' => $p->description,
                'audience' => $p->audience,
                'price_monthly' => $p->price_monthly,
                'price_yearly' => $p->price_yearly,
                'trial_days' => $p->trial_days,
                'features' => $p->features->map(fn ($f) => ['key' => $f->feature->value, 'label' => $f->feature->label(), 'limit' => $f->limit_value]),
            ]),
            'canonical' => route('pricing'),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('Public/Contact', ['canonical' => route('contact')]);
    }

    public function submitContact(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'min:10', 'max:5000'],
            'website' => ['prohibited'], // honeypot
        ]);

        ContactMessage::create($validated);

        return back()->with('success', __('Thank you. We will get back to you shortly.'));
    }
}
