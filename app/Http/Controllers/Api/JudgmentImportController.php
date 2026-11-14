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
 * Receives judgment metadata from the Python LHC scraper and stores it in the
 * existing reported_judgments table. Duplicates are detected by PDF URL or by
 * normalized case details; empty pdf/source/tag-line fields on a duplicate are
 * backfilled without overwriting values an admin already saved.
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
            'tag_line' => ['nullable', 'string', 'max:2000'],
            'decision_date' => ['nullable', 'date'],
            'uploaded_on' => ['required', 'date_format:Y-m-d'],
            'pdf_path' => ['required', 'url:http,https', 'max:500'],
            'source_url' => ['required', 'url:http,https', 'max:500'],
            'slug' => ['nullable', 'string', 'max:180'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $court = $data['court'] ?? 'lhc';
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
            'citation' => $data['citation'] ?? null,
            'tag_line' => $data['tag_line'] ?? null,
            'decision_date' => null,
            'uploaded_on' => $data['uploaded_on'],
            'pdf_path' => $data['pdf_path'],
            'source_url' => $data['source_url'],
            'is_published' => true,
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
            ->get(['id', 'slug', 'case_number', 'title', 'pdf_path', 'source_url', 'tag_line'])
            ->first(fn (ReportedJudgment $row) => $this->normalize($row->title) === $title);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function backfill(ReportedJudgment $judgment, array $data): bool
    {
        $updates = [];

        foreach (['pdf_path', 'source_url', 'tag_line'] as $field) {
            if (blank($judgment->getAttribute($field)) && filled($data[$field] ?? null)) {
                $updates[$field] = $data[$field];
            }
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

    private function normalize(string $value): string
    {
        return preg_replace('/[^a-z0-9]+/', '', Str::lower($value)) ?? '';
    }
}
