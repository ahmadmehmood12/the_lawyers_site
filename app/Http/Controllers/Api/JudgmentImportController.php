<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportedJudgment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Receives judgment metadata from the Python LHC, PHC and Supreme Court scrapers and stores it in the
 * existing reported_judgments table. Duplicates are detected by PDF URL or by
 * normalized case details; empty pdf/source/tag-line/citation fields on a duplicate
 * are backfilled without overwriting values an admin already saved. The scraper reads
 * citations from the PDF; without one, the citation comes from the PDF file name.
 */
class JudgmentImportController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->merge(['court' => Str::lower((string) $request->input('court', 'lhc'))]);

        $data = $request->validate([
            'court' => ['sometimes', 'string', Rule::in(array_keys(ReportedJudgment::COURTS))],
            'case_type' => ['required', 'string', 'max:160'],
            'case_number' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:500'],
            'judges' => ['required', 'string', 'max:500'],
            'citation' => ['nullable', 'string', 'max:120'],
            'other_citation' => ['nullable', 'string', 'max:120'],
            'sc_citation' => ['nullable', 'string', 'max:120'],
            'remarks' => ['nullable', 'string'],
            'summary' => ['nullable', 'array'],
            'summary.overview' => ['nullable', 'string', 'max:5000'],
            'summary.facts' => ['nullable', 'string', 'max:10000'],
            'summary.issues' => ['nullable', 'array', 'max:30'],
            'summary.issues.*' => ['string', 'max:2000'],
            'summary.held' => ['nullable', 'string', 'max:10000'],
            'summary.reasoning' => ['nullable', 'string', 'max:20000'],
            'summary.laws' => ['nullable', 'array', 'max:60'],
            'summary.laws.*' => ['string', 'max:500'],
            'summary.outcome' => ['nullable', 'string', 'max:1000'],
            'summary.model' => ['nullable', 'string', 'max:80'],
            'cited_citations' => ['nullable', 'array', 'max:200'],
            'cited_citations.*' => ['string', 'max:120'],
            'tag_line' => ['nullable', 'string'],
            'decision_date' => ['nullable', 'date'],
            'uploaded_on' => ['required', 'date_format:Y-m-d'],
            'pdf_path' => ['required', 'url:http,https', 'max:500'],
            'source_url' => ['required', 'url:http,https', 'max:500'],
            'slug' => ['nullable', 'string', 'max:180'],
            'is_published' => ['sometimes', 'boolean'],
            'is_reported' => ['sometimes', 'boolean'],
        ]);

        $court = $data['court'] ?? 'lhc';
        $data['citation'] = filled($data['citation'] ?? null) ? trim($data['citation']) : ReportedJudgment::citationFromPdfUrl($data['pdf_path']);
        $data['cited_citations'] = array_values(array_unique(array_filter(array_map('trim', $data['cited_citations'] ?? [])))) ?: null;
        $data['summary'] = $this->summary($data['summary'] ?? null);
        $existing = $this->findDuplicate($data, $court);

        if ($existing instanceof ReportedJudgment) {
            $backfilled = $this->backfill($existing, $data);

            return response()->json([
                'status' => 'duplicate',
                'id' => $existing->id,
                'slug' => $existing->slug,
                'backfilled' => $backfilled,
            ]);
        }

        $judgment = new ReportedJudgment;
        $judgment->fill([
            'court' => $court,
            'case_type' => $data['case_type'],
            'case_number' => $data['case_number'],
            'title' => $data['title'],
            'judges' => $data['judges'],
            'citation' => $data['citation'],
            'cited_citations' => $data['cited_citations'],
            'tag_line' => $data['tag_line'] ?? null,
            'decision_date' => $data['decision_date'] ?? null,
            'other_citation' => filled($data['other_citation'] ?? null) ? trim($data['other_citation']) : null,
            'remarks' => filled($data['remarks'] ?? null) ? trim($data['remarks']) : null,
            'sc_citation' => filled($data['sc_citation'] ?? null) ? trim($data['sc_citation']) : null,
            'summary' => $data['summary'],
            'uploaded_on' => $data['uploaded_on'],
            'pdf_path' => $data['pdf_path'],
            'source_url' => $data['source_url'],
            'is_published' => true,
            'is_reported' => (bool) ($data['is_reported'] ?? true),
        ]);
        $judgment->slug = $this->uniqueSlug($data['slug'] ?? null, $court, $data);
        $judgment->views = 0;
        $judgment->save();

        Cache::forget('judgment-counts');

        return response()->json([
            'status' => 'imported',
            'id' => $judgment->id,
            'slug' => $judgment->slug,
        ], 201);
    }

    /**
     * A judgment is a duplicate when its PDF URL matches, or when the court,
     * case number (ignoring separators) and title (ignoring punctuation/case)
     * match an existing row.
     *
     * @param  array<string, mixed>  $data
     */
    private function findDuplicate(array $data, string $court): ?ReportedJudgment
    {
        $byPdf = ReportedJudgment::query()->where('pdf_path', $data['pdf_path'])->first();

        if ($byPdf instanceof ReportedJudgment) {
            return $byPdf;
        }

        $caseNumber = $this->normalize($data['case_number']);
        $title = $this->normalize($data['title']);

        if ($caseNumber === '') {
            return null;
        }

        return ReportedJudgment::query()
            ->where('court', $court)
            ->whereRaw(
                "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(case_number, '-', ''), '/', ''), '.', ''), ' ', ''), '(', ''), ')', '')) = ?",
                [$caseNumber],
            )
            ->get(['id', 'slug', 'case_number', 'title', 'pdf_path', 'source_url', 'tag_line', 'citation', 'other_citation', 'sc_citation', 'remarks', 'decision_date', 'cited_citations', 'summary', 'is_reported'])
            ->first(fn (ReportedJudgment $row) => $this->normalize($row->title) === $title);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function backfill(ReportedJudgment $judgment, array $data): bool
    {
        $updates = [];

        foreach (['pdf_path', 'source_url', 'tag_line', 'citation', 'other_citation', 'sc_citation', 'remarks', 'decision_date', 'cited_citations', 'summary'] as $field) {
            if (blank($judgment->getAttribute($field)) && filled($data[$field] ?? null)) {
                $updates[$field] = $data[$field];
            }
        }

        // A judgment first seen as unreported (Supreme Court latest page) becomes reported; never the reverse.
        if (($data['is_reported'] ?? true) && $judgment->getAttribute('is_reported') === false) {
            $updates['is_reported'] = true;
        }

        if ($updates === []) {
            return false;
        }

        $judgment->fill($updates)->save();
        Cache::forget('judgment-counts');

        return true;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function uniqueSlug(?string $requested, string $court, array $data): string
    {
        $source = filled($requested)
            ? $requested
            : $court.' '.$data['case_type'].' '.$data['case_number'].' '.$data['title'];

        $base = Str::limit(Str::slug($source), 150, '');
        $base = $base !== '' ? $base : 'judgment';
        $slug = $base;
        $suffix = 2;

        while (ReportedJudgment::query()->where('slug', $slug)->exists()) {
            $slug = Str::limit($base, 140, '').'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    /**
     * Only the known summary keys are kept (AI output from the scrapers).
     *
     * @param  array<string, mixed>|null  $summary
     * @return array<string, mixed>|null
     */
    private function summary(?array $summary): ?array
    {
        if (! $summary || blank($summary['overview'] ?? null)) {
            return null;
        }

        return [...collect($summary)->only(['overview', 'facts', 'issues', 'held', 'reasoning', 'laws', 'outcome', 'model'])->all(), 'generated_at' => now()->toDateString()];
    }

    private function normalize(string $value): string
    {
        return preg_replace('/[^a-z0-9]+/', '', Str::lower($value)) ?? '';
    }
}
