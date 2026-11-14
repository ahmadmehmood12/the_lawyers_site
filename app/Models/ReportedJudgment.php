<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** A judgment approved for reporting by a High Court (or the Supreme Court). */
#[Fillable(['court', 'case_type', 'case_number', 'title', 'judges', 'citation', 'tag_line', 'decision_date', 'uploaded_on', 'pdf_path', 'source_url', 'slug', 'is_published'])]
class ReportedJudgment extends Model
{
    /** @var array<string, array{name: string, short: string, province: string}> */
    public const COURTS = [
        'lhc' => ['name' => 'Lahore High Court', 'short' => 'LHC', 'province' => 'Punjab'],
        'shc' => ['name' => 'Sindh High Court', 'short' => 'SHC', 'province' => 'Sindh'],
        'phc' => ['name' => 'Peshawar High Court', 'short' => 'PHC', 'province' => 'Khyber Pakhtunkhwa'],
        'bhc' => ['name' => 'Balochistan High Court', 'short' => 'BHC', 'province' => 'Balochistan'],
        'ihc' => ['name' => 'Islamabad High Court', 'short' => 'IHC', 'province' => 'Islamabad Capital Territory'],
        'scp' => ['name' => 'Supreme Court of Pakistan', 'short' => 'SCP', 'province' => 'Pakistan'],
    ];

    protected function casts(): array
    {
        return ['decision_date' => 'date', 'uploaded_on' => 'date', 'is_published' => 'boolean', 'views' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $judgment): void {
            $judgment->slug ??= Str::limit(Str::slug($judgment->court.' '.$judgment->case_type.' '.$judgment->case_number), 150, '').'-'.Str::lower(Str::random(5));
        });
    }

    /** @return array<string, mixed> */
    public function toListItem(): array
    {
        return [
            'id' => $this->id, 'slug' => $this->slug, 'court' => $this->court, 'court_name' => self::COURTS[$this->court]['name'] ?? $this->court,
            'case_type' => $this->case_type, 'case_number' => $this->case_number, 'title' => $this->title, 'judges' => $this->judges,
            'citation' => $this->citation, 'tag_line' => $this->tag_line,
            'decision_date' => $this->decision_date?->toDateString(), 'uploaded_on' => $this->uploaded_on->toDateString(),
            'pdf_url' => PublicFile::url($this->pdf_path), 'source_url' => $this->source_url,
        ];
    }
}
