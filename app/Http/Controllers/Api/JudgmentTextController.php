<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JudgmentKeyword;
use App\Models\JudgmentPage;
use App\Models\ReportedJudgment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Receives the extracted full text (page by page) and keywords of a judgment PDF from the
 * scrapers' text indexer and stores them for phrase and keyword search. The judgment is
 * matched by its PDF URL (the metadata must already have been imported). Re-sending the same
 * judgment replaces its pages and keywords, so a re-run or an improved OCR pass is idempotent.
 */
class JudgmentTextController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pdf_path' => ['required', 'url:http,https', 'max:500'],
            'ocr_used' => ['sometimes', 'boolean'],
            'status' => ['nullable', 'string', 'max:20'],
            'pages' => ['required', 'array', 'min:1', 'max:400'],
            'pages.*.page' => ['required', 'integer', 'min:1', 'max:5000'],
            'pages.*.body' => ['present', 'string'],
            'keywords' => ['nullable', 'array', 'max:400'],
            'keywords.*.keyword' => ['required', 'string', 'max:190'],
            'keywords.*.frequency' => ['sometimes', 'integer', 'min:1'],
        ]);

        $judgment = ReportedJudgment::query()->where('pdf_path', $data['pdf_path'])->first();

        if (! $judgment instanceof ReportedJudgment) {
            return response()->json(['status' => 'not_found', 'message' => 'No judgment with that PDF URL; import the metadata first.'], 404);
        }

        $pages = collect($data['pages'])
            ->filter(fn (array $page) => trim($page['body']) !== '')
            ->unique('page')
            ->map(fn (array $page) => [
                'reported_judgment_id' => $judgment->id,
                'page_number' => (int) $page['page'],
                'body' => $page['body'],
                'created_at' => now(),
                'updated_at' => now(),
            ])->values();

        if ($pages->isEmpty()) {
            return response()->json(['status' => 'empty', 'message' => 'No readable text on any page.'], 422);
        }

        $keywords = collect($data['keywords'] ?? [])
            ->map(fn (array $kw) => ['keyword' => trim($kw['keyword']), 'frequency' => (int) ($kw['frequency'] ?? 1)])
            ->filter(fn (array $kw) => $kw['keyword'] !== '')
            ->unique('keyword')
            ->map(fn (array $kw) => [...$kw, 'reported_judgment_id' => $judgment->id, 'created_at' => now(), 'updated_at' => now()])
            ->values();

        DB::transaction(function () use ($judgment, $pages, $keywords, $data): void {
            JudgmentPage::query()->where('reported_judgment_id', $judgment->id)->delete();
            JudgmentKeyword::query()->where('reported_judgment_id', $judgment->id)->delete();
            $pages->chunk(100)->each(fn ($chunk) => JudgmentPage::query()->insert($chunk->all()));
            $keywords->chunk(200)->each(fn ($chunk) => JudgmentKeyword::query()->insert($chunk->all()));

            $judgment->forceFill([
                'text_extracted_at' => now(),
                'ocr_used' => (bool) ($data['ocr_used'] ?? false),
                'page_count' => $pages->count(),
                'extraction_status' => $data['status'] ?? 'ok',
            ])->save();
        });

        return response()->json([
            'status' => 'indexed',
            'id' => $judgment->id,
            'pages' => $pages->count(),
            'keywords' => $keywords->count(),
        ]);
    }
}
