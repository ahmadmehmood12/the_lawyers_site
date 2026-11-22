<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportedJudgment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * For the scrapers' --reindex-scanned pass: judgments of one court whose extracted text is
 * incomplete (scanned PDFs read without OCR: partial / needs_ocr / empty / error, or never indexed
 * although a PDF is stored). See docs/judgment-automation.md.
 */
class JudgmentNeedsTextController extends Controller
{
    public const STATUSES = ['partial', 'needs_ocr', 'empty', 'error'];

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['court' => ['required', 'string', Rule::in(array_keys(ReportedJudgment::COURTS))]]);

        $rows = ReportedJudgment::query()
            ->where('court', $data['court'])
            ->where(fn ($q) => $q->whereIn('extraction_status', self::STATUSES)
                ->orWhere(fn ($w) => $w->whereNotNull('stored_pdf_path')->whereNull('text_extracted_at')))
            ->orderBy('id')
            ->get(['id', 'pdf_path', 'source_pdf_url', 'case_number', 'extraction_status']);

        return response()->json(['count' => $rows->count(), 'judgments' => $rows]);
    }
}
