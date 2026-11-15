<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** A judgment approved for reporting by a High Court (or the Supreme Court). */
#[Fillable(['court', 'case_type', 'case_number', 'title', 'judges', 'citation', 'cited_citations', 'tag_line', 'decision_date', 'uploaded_on', 'pdf_path', 'source_url', 'slug', 'is_published'])]
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
        return ['cited_citations' => 'array', 'decision_date' => 'date', 'uploaded_on' => 'date', 'is_published' => 'boolean', 'views' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $judgment): void {
            $judgment->slug ??= Str::limit(Str::slug($judgment->court.' '.$judgment->case_type.' '.$judgment->case_number), 150, '').'-'.Str::lower(Str::random(5));
        });
    }

    /**
     * The judgment's own citation from a court PDF file name, e.g. .../2026LHC8777.pdf -> "2026 LHC 8777".
     * Courts that publish a reported judgment under its citation name the file this way.
     */
    public static function citationFromPdfUrl(?string $url): ?string
    {
        $file = (string) parse_url((string) $url, PHP_URL_PATH);

        if (! preg_match('/((?:19|20)\d{2})[\s_-]*(LHC|SHC|PHC|BHC|IHC|SCP|SCMR)[\s_-]*(\d{1,6})\.pdf$/i', basename($file), $m)) {
            return null;
        }

        return $m[1].' '.strtoupper($m[2]).' '.(int) $m[3];
    }

    /** True when the PDF is an external link (court website) rather than a file uploaded here. */
    public function pdfIsLink(): bool
    {
        return (bool) preg_match('#^https?://#i', (string) $this->pdf_path);
    }

    /** @return array<string, mixed> */
    public function toListItem(): array
    {
        return [
            'id' => $this->id, 'slug' => $this->slug, 'court' => $this->court, 'court_name' => self::COURTS[$this->court]['name'] ?? $this->court,
            'case_type' => $this->case_type, 'case_number' => $this->case_number, 'title' => $this->title, 'judges' => $this->judges,
            'citation' => $this->citation, 'cited_citations' => array_values($this->cited_citations ?? []), 'tag_line' => $this->tag_line,
            'decision_date' => $this->decision_date?->toDateString(), 'uploaded_on' => $this->uploaded_on->toDateString(),
            'pdf_url' => PublicFile::url($this->pdf_path), 'pdf_is_link' => $this->pdfIsLink(), 'source_url' => $this->source_url,
        ];
    }
}
