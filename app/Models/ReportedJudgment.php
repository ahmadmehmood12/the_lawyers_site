<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/** A judgment approved for reporting by a High Court (or the Supreme Court). */
#[Fillable(['court', 'case_type', 'case_number', 'title', 'judges', 'bench', 'apex_court_case', 'apex_court_status', 'citation', 'other_citation', 'sc_citation', 'cited_citations', 'tag_line', 'remarks', 'summary', 'decision_date', 'uploaded_on', 'pdf_path', 'stored_pdf_path', 'source_pdf_url', 'pdf_bytes', 'source_url', 'slug', 'is_published', 'is_reported', 'text_extracted_at', 'ocr_used', 'page_count', 'extraction_status'])]
class ReportedJudgment extends Model
{
    /** @var array<string, array{name: string, short: string, province: string}> */
    /** Courts whose scrapers record Division / Single bench (the D.B. / S.B. badge). */
    public const BENCH_COURTS = ['shc', 'ihc', 'bhc'];

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
        return ['cited_citations' => 'array', 'summary' => 'array', 'decision_date' => 'date', 'uploaded_on' => 'date', 'is_published' => 'boolean', 'is_reported' => 'boolean', 'bench' => 'boolean', 'views' => 'integer', 'text_extracted_at' => 'datetime', 'ocr_used' => 'boolean', 'page_count' => 'integer', 'pdf_bytes' => 'integer'];
    }

    /** @return HasMany<JudgmentPage, $this> */
    public function pages(): HasMany
    {
        return $this->hasMany(JudgmentPage::class);
    }

    /** @return HasMany<JudgmentKeyword, $this> */
    public function keywords(): HasMany
    {
        return $this->hasMany(JudgmentKeyword::class);
    }

    protected static function booted(): void
    {
        static::creating(function (self $judgment): void {
            $judgment->slug ??= Str::limit(Str::slug($judgment->court.' '.$judgment->case_type.' '.$judgment->case_number), 150, '').'-'.Str::lower(Str::random(5));
        });

        // Two or more judges named = a Division Bench, whichever court or path (scraper, admin, CSV) saved it.
        // Only ever switches the flag on, so an explicit D.B. from a court's own marker is never undone.
        static::saving(function (self $judgment): void {
            if (! $judgment->bench && count(self::judgeNames($judgment->judges)) > 1) {
                $judgment->bench = true;
            }
        });

        static::saved(fn () => Cache::forget('judgment-judges'));
        static::deleted(fn () => Cache::forget('judgment-judges'));
    }

    /**
     * The individual judges named in a judges text, without titles, e.g.
     * "Hon'ble Chief Justice Mr. Justice Aqeel Ahmed Abbasi(Author), Hon'ble Mr. Justice Arshad Hussain Khan"
     *   -> ["Aqeel Ahmed Abbasi", "Arshad Hussain Khan"];
     * "Former Honourable Justice Mr. Justice Syed Qalb-e-Hassan" -> ["Syed Qalb-e-Hassan"];
     * "Justice Iqbal Ahmed Kasi, Justice Muhammad Aamir Nawaz Rana" -> both names.
     *
     * @return list<string>
     */
    public static function judgeNames(?string $judges): array
    {
        $text = preg_replace('/\(\s*(?:author|r|retd\.?|retired)\s*\)/i', '', (string) $judges) ?? '';
        // Role suffixes written after a name ("…, Senior Puisne Judge", "…, C.J.", "…, JJ") are not names.
        $text = preg_replace('/,\s*(?:Senior\s+Pu[i]?s[i]?ne\s+Judge|Chief\s+Justice|C\.?\s?J\.?|JJ?\.?)(?=\s*(?:,|;|$))/iu', '', $text) ?? '';
        $titles = '/^(?:(?:former|honou?rable|hon[\'’]?ble|the|chief|acting|justice|senior|pu[i]?s[i]?ne|judge|mr\.?|mrs\.?|ms\.?|madam|miss)\s+)+/iu';

        $names = [];
        foreach (preg_split('/\s*[,;&]\s*|\s+and\s+/iu', $text) ?: [] as $part) {
            $name = trim((string) preg_replace($titles, '', trim($part)));
            $name = trim((string) preg_replace('/\s*,?\s*\b(?:C\.?\s?J|JJ?)\.?$/u', '', $name), " .,-\t\n");
            $name = preg_replace('/\s+/u', ' ', $name) ?? '';
            if (mb_strlen($name) < 4 || preg_match('/\d/', $name) || ! preg_match('/\p{L}{2,}\s+\p{L}/u', $name)) {
                continue;
            }
            // Names printed in capitals (PLJ headers) are stored in title case.
            $names[] = mb_strtoupper($name) === $name ? Str::title(mb_strtolower($name)) : $name;
        }

        return array_values(array_unique($names));
    }

    /**
     * Every judge named in published judgments, one entry per person, built from
     * SELECT DISTINCT court, judges (no separate table). Each judges text is split into
     * individual judges (judgeNames()); spelling variants of one name in judgment PDFs
     * ("Mulakhail" / "Malakhail") are folded into one judge and every variant is kept so
     * filtering finds all of their judgments. Texts naming 2+ judges are the division-bench pairs.
     * Cached 30 minutes; cleared whenever a judgment is saved or deleted.
     *
     * @return array{people: array<string, array{name: string, variants: list<string>, courts: array<string, true>}>, benches: array<string, array{court: string, keys: list<string>}>}
     */
    public static function judgeIndex(): array
    {
        return Cache::remember('judgment-judges', now()->addMinutes(30), function (): array {
            $people = [];
            $benches = [];
            foreach (self::query()->listed()->select(['court', 'judges'])->distinct()->orderBy('court')->cursor() as $row) {
                $keys = [];
                foreach (self::judgeNames($row->judges) as $name) {
                    $key = self::personKey($people, self::nameKey($name));
                    $people[$key] ??= ['name' => $name, 'variants' => [], 'courts' => []];
                    if (! in_array($name, $people[$key]['variants'], true)) {
                        $people[$key]['variants'][] = $name;
                    }
                    $people[$key]['courts'][$row->court] = true;
                    $keys[] = $key;
                }
                $keys = array_values(array_unique($keys));
                if (count($keys) > 1) {
                    sort($keys);
                    $benches[$row->court.':'.implode('|', $keys)] = ['court' => $row->court, 'keys' => $keys];
                }
            }

            return ['people' => $people, 'benches' => $benches];
        });
    }

    /** "Muhammad Kamran Khan Mulakhail" -> "muhammadkamrankhanmulakhail" (for spelling-variant matching). */
    public static function nameKey(string $name): string
    {
        return (string) preg_replace('/[^a-z]/', '', Str::lower(Str::ascii($name)));
    }

    /**
     * The key of an existing person whose name is this one with at most one letter different
     * (PDF spellings: "mandhokhail"/"mandokhail", "meskanzai"/"maskanzai"), else the key itself.
     *
     * @param  array<string, mixed>  $people
     */
    private static function personKey(array $people, string $key): string
    {
        if (isset($people[$key]) || strlen($key) < 12) {
            return $key;
        }
        foreach (array_keys($people) as $existing) {
            if (abs(strlen((string) $existing) - strlen($key)) <= 1 && $existing[0] === $key[0] && levenshtein((string) $existing, $key) <= 1) {
                return (string) $existing;
            }
        }

        return $key;
    }

    /**
     * "Hon'ble Judge" options: every judge (of one court when given), sorted by name.
     * [{value: "Aqeel Ahmed Abbasi", label: "Justice Aqeel Ahmed Abbasi", courts: ["SHC"]}]
     *
     * @return list<array{value: string, label: string, courts: list<string>}>
     */
    public static function judgeOptions(?string $court = null): array
    {
        $options = [];
        foreach (self::judgeIndex()['people'] as $person) {
            if ($court !== null && ! isset($person['courts'][$court])) {
                continue;
            }
            $options[] = [
                'value' => $person['name'],
                'label' => 'Justice '.$person['name'],
                'courts' => array_map(fn (string $c) => self::COURTS[$c]['short'] ?? Str::upper($c), array_keys($person['courts'])),
            ];
        }
        usort($options, fn (array $a, array $b) => strcasecmp($a['value'], $b['value']));

        return $options;
    }

    /**
     * "Division bench" options: the actual benches (2+ judges) of published judgments, of one court when given.
     * value = the judges' names joined by "|"; label = "Justice A & Justice B".
     *
     * @return list<array{value: string, label: string, courts: list<string>}>
     */
    public static function benchOptions(?string $court = null): array
    {
        $index = self::judgeIndex();
        $options = [];
        foreach ($index['benches'] as $bench) {
            if ($court !== null && $bench['court'] !== $court) {
                continue;
            }
            $names = array_map(fn (string $key) => $index['people'][$key]['name'], $bench['keys']);
            $value = implode('|', $names);
            $options[$value] ??= ['value' => $value, 'label' => implode(' & ', array_map(fn ($n) => 'Justice '.$n, $names)), 'courts' => []];
            $options[$value]['courts'][] = self::COURTS[$bench['court']]['short'] ?? Str::upper($bench['court']);
        }
        $options = array_values($options);
        usort($options, fn (array $a, array $b) => strcasecmp($a['label'], $b['label']));

        return $options;
    }

    /**
     * Every spelling of a judge's name found in judgments (for filtering), from a filter value.
     *
     * @return list<string>
     */
    public static function judgeVariants(string $name): array
    {
        $people = self::judgeIndex()['people'];
        $key = self::personKey($people, self::nameKey($name));

        return $people[$key]['variants'] ?? [trim($name)];
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

    /** True when the actual PDF has been downloaded and stored on the private disk (served by us). */
    public function hasStoredPdf(): bool
    {
        return filled($this->stored_pdf_path);
    }

    /** Case number / title compared ignoring case, spaces and punctuation ("207-04" == "207/04"). */
    public static function normalizeKey(string $value): string
    {
        return preg_replace('/[^a-z0-9]+/', '', Str::lower($value)) ?? '';
    }

    /**
     * Find a judgment by its PDF URL, or — when that has changed since import — by its identity
     * (court + normalized case number + normalized title). Used by the import duplicate check and by
     * the /text and /pdf endpoints so backfilling works even if the court's PDF link later changes.
     */
    public static function locate(?string $pdfPath, ?string $court, ?string $caseNumber, ?string $title): ?self
    {
        if (filled($pdfPath)) {
            $byPdf = static::query()->where('pdf_path', $pdfPath)->orWhere('source_pdf_url', $pdfPath)->first();
            if ($byPdf instanceof self) {
                return $byPdf;
            }
        }

        if (blank($court) || blank($caseNumber) || blank($title)) {
            return null;
        }

        $caseKey = static::normalizeKey($caseNumber);
        $titleKey = static::normalizeKey($title);

        return static::query()
            ->where('court', $court)
            ->whereRaw(
                "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(case_number, '-', ''), '/', ''), '.', ''), ' ', ''), '(', ''), ')', '')) = ?",
                [$caseKey],
            )
            ->get()
            ->first(fn (self $row) => static::normalizeKey($row->title) === $titleKey);
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
            // Only the Sindh High Court listing records the bench type (Division / Single); other courts leave it blank.
            'bench' => $this->bench, 'bench_label' => in_array($this->court, self::BENCH_COURTS, true) ? ($this->bench ? 'D.B.' : 'S.B.') : null, 'apex_court_case' => $this->apex_court_case, 'apex_court_status' => $this->apex_court_status,
            'citation' => $this->citation, 'other_citation' => $this->other_citation, 'sc_citation' => $this->sc_citation, 'cited_citations' => array_values($this->cited_citations ?? []), 'tag_line' => $this->tag_line,
            // Lists show the start of the remarks (PHC headnotes run to several paragraphs); the detail page sends it whole.
            'remarks' => $this->remarks ? Str::limit($this->remarks, 360) : null,
            'decision_date' => $this->decision_date?->toDateString(), 'uploaded_on' => $this->uploaded_on->toDateString(),
            // A downloaded PDF is served inline by our own route (so the viewer always works and downloads can be gated);
            // otherwise fall back to the external court link or a public admin upload.
            'pdf_url' => $this->hasStoredPdf() ? route('judgments.pdf', $this) : PublicFile::url($this->pdf_path),
            'pdf_is_link' => $this->hasStoredPdf() ? false : $this->pdfIsLink(),
            'pdf_stored' => $this->hasStoredPdf(),
            'download_url' => $this->hasStoredPdf() ? route('judgments.pdf.download', $this) : ($this->pdfIsLink() ? null : PublicFile::url($this->pdf_path)),
            'is_reported' => $this->is_reported, 'source_url' => $this->source_url,
        ];
    }
}
