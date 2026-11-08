<?php

namespace App\Http\Controllers\Public;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleCategory;
use App\Support\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(Request $request): Response
    {
        $articles = Article::query()->published()->with(['author:id,name', 'category:id,name,slug'])
            ->when($request->string('category')->toString(), fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($request->string('tag')->toString(), fn ($q, $slug) => $q->whereHas('tags', fn ($t) => $t->where('slug', $slug)))
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->latest('published_at')->paginate(12)->withQueryString()
            ->through(fn (Article $a) => ['slug' => $a->slug, 'title' => $a->title, 'excerpt' => $a->excerpt, 'author' => $a->author->name, 'category' => $a->category?->name, 'published_at' => $a->published_at->toDateString(), 'language' => $a->language]);

        return Inertia::render('Public/Articles/Index', [
            'articles' => $articles,
            'categories' => ArticleCategory::query()->orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['category', 'tag', 'search']),
            'canonical' => route('articles.index'),
        ]);
    }

    public function show(Article $article): Response
    {
        abort_unless(Article::query()->published()->whereKey($article->id)->exists(), 404);
        $article->increment('views');
        $article->load(['author:id,name', 'author.lawyerProfile:id,user_id,slug', 'category:id,name,slug', 'tags:id,name,slug']);

        return Inertia::render('Public/Articles/Show', [
            'article' => [
                'slug' => $article->slug, 'title' => $article->title, 'excerpt' => $article->excerpt,
                'body' => HtmlSanitizer::clean($article->body), 'language' => $article->language,
                'author' => $article->author->name, 'author_slug' => $article->author->lawyerProfile?->slug,
                'category' => $article->category?->only(['name', 'slug']), 'tags' => $article->tags->map->only(['name', 'slug']),
                'published_at' => $article->published_at->toIso8601String(), 'updated_at' => $article->updated_at->toIso8601String(),
            ],
            'comments' => $article->comments()->where('status', ReviewStatus::Approved->value)->with('user:id,name')->latest()->limit(50)->get()
                ->map(fn ($c) => ['id' => $c->id, 'body' => $c->body, 'author' => $c->user->name, 'created_at' => $c->created_at->toDateString()]),
            'canonical' => route('articles.show', $article),
        ]);
    }

    public function comment(Request $request, Article $article): RedirectResponse
    {
        abort_unless(Article::query()->published()->whereKey($article->id)->exists(), 404);
        $validated = $request->validate(['body' => ['required', 'string', 'min:3', 'max:2000']]);

        $article->comments()->create([...$validated, 'user_id' => $request->user()->id, 'status' => ReviewStatus::Pending]);

        return back()->with('success', __('Thank you. Your comment will appear after moderation.'));
    }
}
