<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportedJudgment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Receives a judgment PDF the scraper downloaded from a court website and stores it on the
 * private `local` disk, so the site serves the file itself (the viewer always works and
 * downloads can be plan-gated) instead of only linking out. The judgment is matched by the
 * court PDF URL that was sent at metadata import time. Re-uploading replaces the stored file.
 */
class JudgmentPdfController extends Controller
{
    private const DISK = 'local';

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pdf_path' => ['required', 'url:http,https', 'max:500'],
            // Identity fallback so backfilling works even if the court's PDF link changed since import.
            'court' => ['nullable', 'string', 'max:10'],
            'case_number' => ['nullable', 'string', 'max:60'],
            'title' => ['nullable', 'string', 'max:500'],
            'pdf' => ['required', 'file', 'mimetypes:application/pdf', 'max:25600'],
        ]);

        $judgment = ReportedJudgment::locate($data['pdf_path'], $data['court'] ?? null, $data['case_number'] ?? null, $data['title'] ?? null);

        if (! $judgment instanceof ReportedJudgment) {
            return response()->json(['status' => 'not_found', 'message' => 'No matching judgment; import the metadata first.'], 404);
        }

        $file = $request->file('pdf');
        // Grouped by court and upload date, named id-case_number-title:
        // judgments/<court>/<YYYY-MM-DD>/<id>-<case-number>-<title>.pdf
        $directory = 'judgments/'.$judgment->court.'/'.$judgment->uploaded_on->format('Y-m-d');
        $slug = Str::limit(Str::slug($judgment->case_number.' '.$judgment->title), 120, '');
        $name = trim($judgment->id.'-'.$slug, '-').'.pdf';

        // Replace any previously stored file (keeps the path stable per judgment).
        if (filled($judgment->stored_pdf_path) && $judgment->stored_pdf_path !== "{$directory}/{$name}") {
            Storage::disk(self::DISK)->delete($judgment->stored_pdf_path);
        }
        $path = $file->storeAs($directory, $name, self::DISK);

        $judgment->forceFill([
            'stored_pdf_path' => $path,
            'source_pdf_url' => $data['pdf_path'],
            'pdf_bytes' => $file->getSize(),
        ])->save();

        Cache::forget('judgment-counts');

        return response()->json([
            'status' => 'stored',
            'id' => $judgment->id,
            'path' => $path,
            'bytes' => $judgment->pdf_bytes,
        ]);
    }
}
