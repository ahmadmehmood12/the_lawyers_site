<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Specialization;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SpecializationController extends Controller
{
    public function index(): Response
    {
        $ur = app()->getLocale() === 'ur';

        return Inertia::render('Public/Specializations', [
            'specializations' => Specialization::query()->where('is_active', true)->withCount(['lawyers' => fn ($q) => $q->listed()])->orderBy('sort_order')->get()
                ->map(fn ($s) => ['slug' => $s->slug, 'name' => $ur && $s->name_ur ? $s->name_ur : $s->name, 'description' => $ur && $s->description_ur ? $s->description_ur : $s->description, 'icon' => $s->icon, 'count' => $s->lawyers_count]),
            'canonical' => route('specializations.index'),
        ]);
    }

    public function show(Specialization $specialization): RedirectResponse
    {
        return redirect()->route('lawyers.index', ['specialization' => $specialization->slug]);
    }
}
