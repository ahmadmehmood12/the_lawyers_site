<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/** Public /faqs page: every active question, grouped by category. */
class FaqPageController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Public/Faqs', [
            'faqs' => self::all(),
            'canonical' => route('faqs'),
        ]);
    }

    /** @return list<array{id: int, category: ?string, question: string, answer: string, show_on_home: bool}> */
    public static function all(): array
    {
        return Cache::remember(FaqController::CACHE_KEY.'-'.app()->getLocale(), now()->addHour(), fn () => Faq::query()->active()->get()
            ->map(fn (Faq $f) => [...$f->toPublic(), 'show_on_home' => $f->show_on_home])->values()->all());
    }
}
