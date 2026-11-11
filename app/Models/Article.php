<?php

namespace App\Models;

use App\Enums\ArticleStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['author_id', 'article_category_id', 'title', 'slug', 'language', 'excerpt', 'body', 'cover_path', 'status', 'rejection_reason', 'published_at', 'approved_by'])]
class Article extends Model
{
    use SoftDeletes;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['status' => 'draft', 'language' => 'en', 'views' => 0, 'likes_count' => 0];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ArticleStatus::class,
            'published_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ArticleCategory::class, 'article_category_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ArticleComment::class);
    }

    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('status', ArticleStatus::Published->value)->where('published_at', '<=', now());
    }

    public function likes(): HasMany
    {
        return $this->hasMany(ArticleLike::class);
    }

    /**
     * Data for the shared ArticleCard (resources/js/Components/domain/ArticleCard.tsx).
     *
     * @return array{slug: string, title: string, excerpt: ?string, author: string, category: ?string, published_at: string, language: string, views: int, likes: int}
     */
    public function toCard(?string $author = null): array
    {
        return [
            'slug' => $this->slug, 'title' => $this->title, 'excerpt' => $this->excerpt,
            'author' => $author ?? (string) $this->author?->name, 'category' => $this->category?->name,
            'published_at' => $this->published_at->toDateString(), 'language' => $this->language,
            'views' => (int) $this->views, 'likes' => (int) $this->likes_count,
        ];
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
