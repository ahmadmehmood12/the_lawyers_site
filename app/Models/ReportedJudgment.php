<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** A judgment approved for reporting by a High Court (or the Supreme Court). */
#[Fillable(['court', 'case_type', 'case_number', 'title', 'judges', 'citation', 'other_citation', 'sc_citation', 'cited_citations', 'tag_line', 'remarks', 'summary', 'decision_date', 'uploaded_on', 'pdf_path', 'source_url', 'slug', 'is_published', 'is_reported'])]
class ReportedJudgment extends Model
{
    /** @var array<string, array{name: string, short: string, province: string}> */
    public const COURTS = [
        'scp' => ['name' => 'Supreme Court of Pakistan', 'short' => 'SCP', 'province' => 'Pakistan'],
        'fcc' => ['name' => 'Federal Constitutional Court', 'short' => 'FCC', 'province' => 'Pakistan'],
        'fsc' => ['name' => 'Federal Shariat Court', 'short' => 'FSC', 'province' => 'Pakistan'],
        'lhc' => ['name' => 'Lahore High Court', 'short' => 'LHC', 'province' => 'Punjab'],
        'shc' => ['name' => 'Sindh High Court', 'short' => 'SHC', 'province' => 'Sindh'],
        'phc' => ['name' => 'Peshawar High Court', 'short' => 'PHC', 'province' => 'Khyber Pakhtunkhwa'],
        'bhc' => ['name' => 'Balochistan High Court', 'short' => 'BHC', 'province' => 'Balochistan'],
        'ihc' => ['name' => 'Islamabad High Court', 'short' => 'IHC', 'province' => 'Islamabad Capital Territory'],
    ];

    protected function casts(): array
    {
        return ['cited_citations' => 'array', 'summary' => 'array', 'decision_date' => 'date', 'uploaded_on' => 'date', 'is_published' => 'boolean', 'is_reported' => 'boolean', 'views' => 'integer'];
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

    /**
     * Shown on the public Reported judgments pages: published and approved for reporting.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function listed(Builder $query): void
    {
        $query->where('is_published', true)->where('is_reported', true);
    }

    /** @return array<string, mixed> */
    public function toListItem(): array
    {
        return [
            'id' => $this->id, 'slug' => $this->slug, 'court' => $this->court, 'court_name' => self::COURTS[$this->court]['name'] ?? strtoupper((string) $this->court), 'court_short' => self::COURTS[$this->court]['short'] ?? strtoupper((string) $this->court),
            'case_type' => $this->case_type, 'case_number' => $this->case_number, 'title' => $this->title, 'judges' => $this->judges,
            'citation' => $this->citation, 'other_citation' => $this->other_citation, 'sc_citation' => $this->sc_citation, 'cited_citations' => array_values($this->cited_citations ?? []), 'tag_line' => $this->tag_line,
            // Lists show the start of the remarks (PHC headnotes run to several paragraphs); the detail page sends it whole.
            'remarks' => $this->remarks ? Str::limit($this->remarks, 360) : null,
            'decision_date' => $this->decision_date?->toDateString(), 'uploaded_on' => $this->uploaded_on->toDateString(),
            'pdf_url' => PublicFile::url($this->pdf_path), 'pdf_is_link' => $this->pdfIsLink(), 'is_reported' => $this->is_reported, 'source_url' => $this->source_url,
        ];
    }
}
