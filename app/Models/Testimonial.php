<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Platform testimonial shown on the homepage; `kind` text or video. Managed in Admin, Testimonials. */
#[Fillable(['kind', 'name', 'designation', 'body', 'rating', 'photo_path', 'video_path', 'thumbnail_path', 'is_verified_client', 'is_featured', 'is_active', 'sort_order'])]
class Testimonial extends Model
{
    /** @var array<string, mixed> */
    protected $attributes = ['kind' => 'text', 'is_verified_client' => false, 'is_featured' => false, 'is_active' => true, 'sort_order' => 0];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_verified_client' => 'boolean', 'is_featured' => 'boolean', 'is_active' => 'boolean', 'rating' => 'integer', 'sort_order' => 'integer'];
    }

    /** Active items in display order (featured first). */
    #[Scope]
    protected function published(Builder $query, string $kind): void
    {
        $query->where('kind', $kind)->where('is_active', true)->orderByDesc('is_featured')->orderBy('sort_order')->orderByDesc('id');
    }

    /** @return array<string, mixed> */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'designation' => $this->designation,
            'body' => $this->body,
            'rating' => $this->rating,
            'photo_url' => PublicFile::url($this->photo_path),
            'video_url' => PublicFile::url($this->video_path),
            'thumbnail_url' => PublicFile::url($this->thumbnail_path) ?? PublicFile::url($this->photo_path),
            'verified' => $this->is_verified_client,
            'featured' => $this->is_featured,
        ];
    }
}
