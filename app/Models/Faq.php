<?php

namespace App\Models;

use Database\Factories\FaqFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** A question and answer shown on /faqs and, when show_on_home, on the homepage. */
#[Fillable(['category', 'question', 'question_ur', 'answer', 'answer_ur', 'show_on_home', 'is_active', 'sort_order'])]
class Faq extends Model
{
    /** @use HasFactory<FaqFactory> */
    use HasFactory;

    protected $attributes = ['show_on_home' => false, 'is_active' => true, 'sort_order' => 0];

    protected function casts(): array
    {
        return ['show_on_home' => 'boolean', 'is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Public shape in the current locale (Urdu falls back to English).
     *
     * @return array{id: int, category: ?string, question: string, answer: string}
     */
    public function toPublic(): array
    {
        $ur = app()->getLocale() === 'ur';

        return [
            'id' => $this->id,
            'category' => $this->category,
            'question' => $ur && $this->question_ur ? $this->question_ur : $this->question,
            'answer' => $ur && $this->answer_ur ? $this->answer_ur : $this->answer,
        ];
    }
}
