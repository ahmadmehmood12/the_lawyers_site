<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\ArticleStatus;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleCategory;
use App\Models\Review;
use App\Models\Tag;
use App\Support\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Lawyers write articles (published after moderation) and respond to their reviews. */
class ArticleController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isLawyer(), 403);
        $profile = $request->user()->lawyerProfile;

        return Inertia::render('Workspace/Articles', [
            'articles' => Article::query()->where('author_id', $request->user()->id)->with(['category:id,name', 'tags:id,name'])->latest('updated_at')->get()
                ->map(fn ($a) => [...$a->only(['id', 'title', 'slug', 'excerpt', 'body', 'language', 'rejection_reason', 'article_category_id']), 'status' => $a->status->value, 'status_label' => $a->status->label(), 'tags' => $a->tags->pluck('name')->implode(', '), 'published_at' => $a->published_at?->toDateString()]),
            'categories' => ArticleCategory::query()->orderBy('name')->get()->map(fn ($c) => ['value' => $c->id, 'label' => $c->name]),
            'reviews' => $profile ? Review::query()->where('lawyer_profile_id', $profile->id)->where('status', 'approved')->with('author:id,name')->latest()->get()
                ->map(fn ($r) => ['id' => $r->id, 'rating' => $r->rating, 'title' => $r->title, 'comment' => $r->comment, 'response' => $r->response, 'author' => $r->author->name, 'created_at' => $r->created_at->toDateString()]) : [],
        ]);
    }

    public function save(Request $request, ?Article $article = null): RedirectResponse
    {
        abort_unless($request->user()->isLawyer(), 403);
        abort_if($article && $article->author_id !== $request->user()->id, 404);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'], 'excerpt' => ['nullable', 'string', 'max:300'], 'body' => ['required', 'string', 'max:200000'],
            'language' => ['required', Rule::in(['en', 'ur'])], 'article_category_id' => ['nullable', 'exists:article_categories,id'],
            'tags' => ['nullable', 'string', 'max:200'], 'submit' => ['boolean'],
        ]);

        $article ??= new Article(['author_id' => $request->user()->id, 'slug' => Str::slug(Str::limit($validated['title'], 80, '')).'-'.Str::lower(Str::random(5))]);
        $article->fill([
            ...collect($validated)->only(['title', 'excerpt', 'language', 'article_category_id'])->all(),
            'body' => HtmlSanitizer::clean($validated['body']),
            'status' => $request->boolean('submit') ? ArticleStatus::Pending : ($article->status === ArticleStatus::Published ? ArticleStatus::Pending : ArticleStatus::Draft),
        ])->save();

        $tagIds = collect(explode(',', (string) ($validated['tags'] ?? '')))->map(fn ($t) => trim($t))->filter()->take(8)
            ->map(fn ($t) => Tag::query()->firstOrCreate(['slug' => Str::slug($t)], ['name' => $t])->id);
        $article->tags()->sync($tagIds);

        return back()->with('success', $request->boolean('submit') ? __('Submitted for review.') : __('Draft saved.'));
    }

    public function respond(Request $request, Review $review): RedirectResponse
    {
        abort_unless($review->lawyer_profile_id === $request->user()->lawyerProfile?->id, 404);
        $review->update(['response' => $request->validate(['response' => ['required', 'string', 'max:2000']])['response'], 'responded_at' => now()]);

        return back()->with('success', __('Response published.'));
    }
}
