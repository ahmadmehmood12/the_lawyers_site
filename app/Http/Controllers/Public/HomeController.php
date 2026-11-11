<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\Specialization;
use App\Services\Directory\HomepageShowcase;
use App\Support\ReferenceOptions;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $ur = app()->getLocale() === 'ur';

        return Inertia::render('Public/Home', [
            'specializations' => Specialization::query()->where('is_active', true)->withCount(['lawyers' => fn ($q) => $q->listed()])->orderBy('sort_order')->limit(12)->get()
                ->map(fn ($s) => ['slug' => $s->slug, 'name' => $ur && $s->name_ur ? $s->name_ur : $s->name, 'icon' => $s->icon, 'count' => $s->lawyers_count]),
            'cities' => ReferenceOptions::cities(),
            'stats' => Cache::remember('home-stats', now()->addMinutes(30), fn () => [
                'lawyers' => LawyerProfile::query()->listed()->count(),
                'verified' => LawyerProfile::query()->listed()->where('verification_status', 'approved')->count(),
                'firms' => Organization::query()->where('type', 'firm')->where('is_public', true)->count(),
            ]),
            'articles' => Article::query()->published()->with('author:id,name')->latest('published_at')->limit(3)->get()
                ->map(fn ($a) => ['slug' => $a->slug, 'title' => $a->title, 'excerpt' => $a->excerpt, 'author' => $a->author->name, 'published_at' => $a->published_at->toDateString()]),
            'plans' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get()->map(fn (Plan $p) => [
                'slug' => $p->slug,
                'name' => $ur && $p->name_ur ? $p->name_ur : $p->name,
                'audience' => $p->audience,
                'description' => $p->description,
                'price_monthly' => $p->price_monthly,
                'price_yearly' => $p->price_yearly,
                'trial_days' => $p->trial_days,
            ]),
            // Deferred: real counts and the ranked lawyers load after first paint (skeletons meanwhile).
            'showcase' => Inertia::defer(fn () => [
                'stats' => app(HomepageShowcase::class)->stats(),
                'top' => app(HomepageShowcase::class)->topLawyers(),
                ...app(HomepageShowcase::class)->content(),
            ], 'showcase'),
            'canonical' => route('home'),
        ]);
    }
}
