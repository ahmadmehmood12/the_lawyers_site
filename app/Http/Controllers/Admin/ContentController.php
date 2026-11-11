<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ArticleStatus;
use App\Enums\ComplaintStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleComment;
use App\Models\Complaint;
use App\Models\ContactMessage;
use App\Models\DocumentTemplate;
use App\Models\LawyerProfile;
use App\Models\Page;
use App\Models\Review;
use App\Support\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Templates, articles, reviews, comments, complaints, contact messages and CMS pages. */
class ContentController extends Controller
{
    public function templates(Request $request): Response
    {
        return Inertia::render('Admin/Templates', [
            'templates' => DocumentTemplate::query()->whereNull('organization_id')->with('reviewer:id,name')
                ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
                ->orderBy('category')->orderBy('title')->paginate(30)->withQueryString()
                ->through(fn ($t) => [...$t->only(['id', 'category', 'title', 'title_ur', 'language', 'description', 'body', 'review_status', 'is_active']), 'reviewer' => $t->reviewer?->name, 'reviewed_at' => $t->reviewed_at?->toDateString()]),
            'filters' => $request->only('search'),
            'categories' => ['bail', 'civil', 'appeal', 'family', 'constitutional', 'notice', 'affidavit', 'power-of-attorney', 'property', 'corporate', 'criminal', 'other'],
        ]);
    }

    public function saveTemplate(Request $request, ?DocumentTemplate $template = null): RedirectResponse
    {
        abort_if($template && $template->organization_id !== null, 404);
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:40'], 'title' => ['required', 'string', 'max:255'], 'title_ur' => ['nullable', 'string', 'max:255'],
            'language' => ['required', Rule::in(['en', 'ur'])], 'description' => ['nullable', 'string', 'max:1000'], 'body' => ['required', 'string', 'max:500000'],
            'is_active' => ['boolean'], 'review_status' => ['required', Rule::in(['unreviewed', 'reviewed'])],
        ]);
        $validated['body'] = HtmlSanitizer::clean($validated['body']);
        $template ??= new DocumentTemplate(['created_by' => $request->user()->id]);

        if ($validated['review_status'] === 'reviewed' && $template->review_status !== 'reviewed') {
            $template->forceFill(['reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        } elseif ($validated['review_status'] === 'unreviewed') {
            $template->forceFill(['reviewed_by' => null, 'reviewed_at' => null]);
        }
        $template->fill($validated)->save();

        return back()->with('success', __('Template saved.'));
    }

    /**
     * Moderation queue per tab, filtered by state (pending first by default) with counts per state
     * so the admin sees what still needs a decision. Approved article state is "published".
     */
    public function moderation(Request $request): Response
    {
        $tab = in_array($request->query('tab'), ['articles', 'reviews', 'comments'], true) ? $request->query('tab') : 'articles';
        $approved = $tab === 'articles' ? ArticleStatus::Published->value : ReviewStatus::Approved->value;
        $states = ['pending' => 'pending', 'approved' => $approved, 'rejected' => 'rejected'];
        $state = array_key_exists((string) $request->query('state'), $states) || $request->query('state') === 'all' ? (string) $request->query('state') : 'pending';

        $base = match ($tab) {
            'articles' => fn () => Article::query()->whereIn('status', array_values($states)),
            'reviews' => fn () => Review::query(),
            default => fn () => ArticleComment::query(),
        };
        $counts = $base()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $filtered = fn () => $base()->when($state !== 'all', fn ($q) => $q->where('status', $states[$state]))->orderByRaw("status = 'pending' DESC")->latest('updated_at');

        return Inertia::render('Admin/Moderation', [
            'tab' => $tab,
            'state' => $state,
            'counts' => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'approved' => (int) ($counts[$approved] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
                'all' => (int) $counts->sum(),
            ],
            'articles' => $tab === 'articles' ? $filtered()->with(['author:id,name', 'category:id,name', 'approver:id,name'])->paginate(20)->withQueryString()
                ->through(fn ($a) => ['id' => $a->id, 'title' => $a->title, 'slug' => $a->slug, 'author' => $a->author->name, 'category' => $a->category?->name, 'status' => $a->status->value, 'status_label' => $a->status->label(), 'excerpt' => $a->excerpt, 'body' => HtmlSanitizer::clean($a->body), 'reason' => $a->rejection_reason, 'moderator' => $a->approver?->name, 'views' => (int) $a->views, 'likes' => (int) $a->likes_count, 'updated_at' => $a->updated_at->toIso8601String()]) : null,
            'reviews' => $tab === 'reviews' ? $filtered()->with(['author:id,name', 'lawyerProfile.user:id,name', 'moderator:id,name'])->paginate(20)->withQueryString()
                ->through(fn ($r) => ['id' => $r->id, 'lawyer' => $r->lawyerProfile->user->name, 'author' => $r->author->name, 'rating' => $r->rating, 'title' => $r->title, 'comment' => $r->comment, 'status' => $r->status->value, 'status_label' => $r->status->label(), 'moderator' => $r->moderator?->name, 'moderated_at' => $r->moderated_at?->toIso8601String(), 'created_at' => $r->created_at->toIso8601String()]) : null,
            'comments' => $tab === 'comments' ? $filtered()->with(['user:id,name', 'article:id,title,slug'])->paginate(30)->withQueryString()
                ->through(fn ($c) => ['id' => $c->id, 'article' => $c->article->title, 'article_slug' => $c->article->slug, 'author' => $c->user->name, 'body' => $c->body, 'status' => $c->status->value, 'status_label' => $c->status->label(), 'created_at' => $c->created_at->toIso8601String(), 'updated_at' => $c->updated_at->toIso8601String()]) : null,
        ]);
    }

    public function moderateArticle(Request $request, Article $article): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(['published', 'rejected'])], 'reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:255']]);
        $article->update([
            'status' => $validated['status'], 'rejection_reason' => $validated['reason'] ?? null, 'approved_by' => $request->user()->id,
            'published_at' => $validated['status'] === 'published' ? ($article->published_at ?? now()) : $article->published_at,
        ]);

        return back()->with('success', __('Article updated.'));
    }

    public function moderateReview(Request $request, Review $review): RedirectResponse
    {
        $status = ReviewStatus::from($request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])]])['status']);
        $review->update(['status' => $status, 'moderated_by' => $request->user()->id, 'moderated_at' => now()]);

        $profile = LawyerProfile::query()->findOrFail($review->lawyer_profile_id);
        $approved = $profile->reviews()->where('status', ReviewStatus::Approved->value);
        $profile->forceFill(['rating_average' => round((float) $approved->avg('rating'), 2), 'rating_count' => $approved->count()])->save();

        return back()->with('success', __('Review updated.'));
    }

    public function moderateComment(Request $request, ArticleComment $comment): RedirectResponse
    {
        $comment->update(['status' => $request->validate(['status' => ['required', Rule::in(['approved', 'rejected'])]])['status']]);

        return back()->with('success', __('Comment updated.'));
    }

    public function complaints(Request $request): Response
    {
        return Inertia::render('Admin/Complaints', [
            'complaints' => Complaint::query()->with(['lawyerProfile.user:id,name', 'handler:id,name'])
                ->when($request->string('status')->toString(), fn ($q, $s) => $q->where('status', $s))
                ->latest()->paginate(25)->withQueryString()
                ->through(fn ($c) => [...$c->only(['id', 'name', 'email', 'subject', 'body', 'resolution']), 'status' => $c->status->value, 'status_label' => $c->status->label(), 'lawyer' => $c->lawyerProfile?->user->name, 'handler' => $c->handler?->name, 'created_at' => $c->created_at->toIso8601String()]),
            'openMessages' => ContactMessage::query()->where('status', '!=', 'resolved')->count(),
            'statuses' => ComplaintStatus::options(),
            'filters' => $request->only('status'),
        ]);
    }

    public function updateComplaint(Request $request, Complaint $complaint): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::enum(ComplaintStatus::class)], 'resolution' => ['nullable', 'string', 'max:5000']]);
        $complaint->update([...$validated, 'handled_by' => $request->user()->id]);

        return back()->with('success', __('Complaint updated.'));
    }

    public function pages(): Response
    {
        return Inertia::render('Admin/Pages', ['pages' => Page::query()->orderBy('slug')->get()->map(fn ($p) => [...$p->only(['id', 'slug', 'title', 'title_ur', 'body', 'body_ur', 'meta_description', 'is_published']), 'updated_at' => $p->updated_at->toDateString()])]);
    }

    public function storePage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('pages', 'slug')],
            'title' => ['required', 'string', 'max:255'], 'title_ur' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:500000'], 'body_ur' => ['nullable', 'string', 'max:500000'],
            'meta_description' => ['nullable', 'string', 'max:255'], 'is_published' => ['boolean'],
        ]);
        $validated['body'] = HtmlSanitizer::clean($validated['body']);
        $validated['body_ur'] = HtmlSanitizer::clean($validated['body_ur'] ?? '');
        Page::query()->create($validated);
        cache()->forget('sitemap.xml');

        return back()->with('success', __('Page created.'));
    }

    public function savePage(Request $request, Page $page): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'], 'title_ur' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:500000'], 'body_ur' => ['nullable', 'string', 'max:500000'],
            'meta_description' => ['nullable', 'string', 'max:255'], 'is_published' => ['boolean'],
        ]);
        $validated['body'] = HtmlSanitizer::clean($validated['body']);
        $validated['body_ur'] = HtmlSanitizer::clean($validated['body_ur'] ?? '');
        $page->update($validated);
        cache()->forget('sitemap.xml');

        return back()->with('success', __('Page saved.'));
    }

    public function destroyPage(Page $page): RedirectResponse
    {
        $page->delete();
        cache()->forget('sitemap.xml');

        return back()->with('success', __('Page deleted.'));
    }
}
