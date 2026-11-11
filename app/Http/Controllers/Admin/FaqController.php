<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Admin, FAQs: questions for the homepage section and the /faqs page (docs/Modules/Showcase.md). */
class FaqController extends Controller
{
    public const CACHE_KEY = 'public-faqs';

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $category = $request->string('category')->toString();

        return Inertia::render('Admin/Faqs', [
            'rows' => Faq::query()
                ->when($search, fn ($q) => $q->where(fn ($w) => $w->where('question', 'like', "%{$search}%")->orWhere('answer', 'like', "%{$search}%")))
                ->when($category, fn ($q) => $q->where('category', $category))
                ->orderBy('sort_order')->orderBy('id')->paginate(25)->withQueryString()
                ->through(fn (Faq $f) => $f->only(['id', 'category', 'question', 'question_ur', 'answer', 'answer_ur', 'show_on_home', 'is_active', 'sort_order'])),
            'categories' => Faq::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
            'counts' => [
                'total' => Faq::query()->count(),
                'active' => Faq::query()->where('is_active', true)->count(),
                'home' => Faq::query()->where('is_active', true)->where('show_on_home', true)->count(),
            ],
            'filters' => ['search' => $search, 'category' => $category],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Faq::query()->create($this->validated($request));
        $this->flush();

        return back()->with('success', __('Question added.'));
    }

    public function update(Request $request, Faq $faq): RedirectResponse
    {
        $faq->update($this->validated($request));
        $this->flush();

        return back()->with('success', __('Question saved.'));
    }

    public function toggle(Request $request, Faq $faq): RedirectResponse
    {
        $field = $request->validate(['field' => ['required', Rule::in(['is_active', 'show_on_home'])]])['field'];
        $faq->update([$field => ! $faq->{$field}]);
        $this->flush();

        return back();
    }

    public function destroy(Faq $faq): RedirectResponse
    {
        $faq->delete();
        $this->flush();

        return back()->with('success', __('Question deleted.'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'category' => ['nullable', 'string', 'max:60'],
            'question' => ['required', 'string', 'max:255'],
            'question_ur' => ['nullable', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:5000'],
            'answer_ur' => ['nullable', 'string', 'max:5000'],
            'show_on_home' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]) + ['sort_order' => 0];
    }

    private function flush(): void
    {
        Cache::forget(self::CACHE_KEY.'-en');
        Cache::forget(self::CACHE_KEY.'-ur');
    }
}
