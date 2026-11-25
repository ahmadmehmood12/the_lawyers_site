<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Public\ReportedJudgmentController as PublicJudgments;
use App\Models\ReportedJudgment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Admin, Reported judgments: add, edit, upload the PDF, or import many rows from CSV. */
class ReportedJudgmentController extends Controller
{
    public const CSV_COLUMNS = ['court', 'case_type', 'case_number', 'title', 'judges', 'bench', 'apex_court_case', 'apex_court_status', 'citation', 'other_citation', 'sc_citation', 'tag_line', 'remarks', 'decision_date', 'uploaded_on', 'pdf_url', 'source_url', 'is_reported'];

    public function index(Request $request): Response
    {
        $filters = $request->only(['court', 'search']);

        return Inertia::render('Admin/Judgments', [
            'rows' => PublicJudgments::filtered(ReportedJudgment::query(), ['court' => $filters['court'] ?? null, 'title' => $filters['search'] ?? null])
                ->orderByDesc('uploaded_on')->orderByDesc('id')->paginate(25)->withQueryString()
                ->through(fn (ReportedJudgment $j) => [...$j->toListItem(), 'remarks' => $j->remarks, 'is_published' => $j->is_published, 'views' => $j->views]),
            'courts' => collect(ReportedJudgment::COURTS)->map(fn ($c, $key) => ['value' => $key, 'label' => $c['name']])->values(),
            'counts' => ReportedJudgment::query()->selectRaw('court, COUNT(*) as total')->groupBy('court')->pluck('total', 'court'),
            'filters' => $filters,
            'csvColumns' => self::CSV_COLUMNS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $judgment = new ReportedJudgment;
        $this->fill($request, $judgment);

        return back()->with('success', __('Judgment added.'));
    }

    public function update(Request $request, ReportedJudgment $judgment): RedirectResponse
    {
        $this->fill($request, $judgment);

        return back()->with('success', __('Judgment saved.'));
    }

    public function destroy(ReportedJudgment $judgment): RedirectResponse
    {
        if ($judgment->pdf_path && ! $judgment->pdfIsLink()) {
            Storage::disk('public')->delete($judgment->pdf_path);
        }
        if ($judgment->hasStoredPdf()) {
            Storage::disk('local')->delete($judgment->stored_pdf_path);
        }
        $judgment->delete();
        Cache::forget('judgment-counts');

        return back()->with('success', __('Judgment removed.'));
    }

    /** Bulk import: a CSV with a header row using CSV_COLUMNS (court as lhc, shc, phc, bhc, ihc or scp). */
    public function import(Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = array_map(fn ($h) => strtolower(trim((string) $h, " \t\n\r\0\x0B\xEF\xBB\xBF")), fgetcsv($handle) ?: []);
        $added = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, array_pad($row, count($header), null)) ?: [];
            $court = strtolower(trim((string) ($data['court'] ?? '')));

            if (! isset(ReportedJudgment::COURTS[$court]) || blank($data['case_number'] ?? null) || blank($data['title'] ?? null)) {
                $skipped++;

                continue;
            }

            $date = fn ($v) => filled($v) ? rescue(fn () => Carbon::parse($v)->toDateString(), null, false) : null;
            $pdfUrl = filter_var($data['pdf_url'] ?? null, FILTER_VALIDATE_URL) ?: null;
            ReportedJudgment::query()->updateOrCreate(
                ['court' => $court, 'case_number' => trim($data['case_number']), 'title' => trim($data['title'])],
                [
                    'case_type' => trim((string) ($data['case_type'] ?? '')) ?: 'Case', 'judges' => trim((string) ($data['judges'] ?? '')) ?: '—',
                    'bench' => in_array(strtolower(trim((string) ($data['bench'] ?? '0'))), ['1', 'yes', 'true', 'd.b.', 'db', 'division'], true),
                    'apex_court_case' => ($data['apex_court_case'] ?? null) ?: null, 'apex_court_status' => ($data['apex_court_status'] ?? null) ?: null,
                    'citation' => ($data['citation'] ?? null) ?: ReportedJudgment::citationFromPdfUrl($pdfUrl), 'other_citation' => ($data['other_citation'] ?? null) ?: null, 'sc_citation' => ($data['sc_citation'] ?? null) ?: null, 'remarks' => ($data['remarks'] ?? null) ?: null, 'tag_line' => ($data['tag_line'] ?? null) ?: null,
                    'decision_date' => $date($data['decision_date'] ?? null), 'uploaded_on' => $date($data['uploaded_on'] ?? null) ?? today()->toDateString(),
                    'source_url' => filter_var($data['source_url'] ?? null, FILTER_VALIDATE_URL) ?: null, 'is_published' => true,
                    'is_reported' => ! in_array(strtolower(trim((string) ($data['is_reported'] ?? '1'))), ['0', 'no', 'false'], true),
                    ...($pdfUrl ? ['pdf_path' => $pdfUrl] : []),
                ],
            );
            $added++;
        }
        fclose($handle);
        Cache::forget('judgment-counts');

        return back()->with('success', __('Imported :added judgments. Skipped :skipped rows.', ['added' => $added, 'skipped' => $skipped]));
    }

    private function fill(Request $request, ReportedJudgment $judgment): void
    {
        $link = $request->input('text_mode') === 'link';
        // A scraped-and-stored PDF (on the private disk) counts as an existing file, so editing other fields doesn't force a re-upload.
        $hasUploadedPdf = ($judgment->pdf_path && ! $judgment->pdfIsLink()) || $judgment->hasStoredPdf();

        $data = $request->validate([
            'court' => ['required', Rule::in(array_keys(ReportedJudgment::COURTS))],
            'case_type' => ['required', 'string', 'max:160'],
            'case_number' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:500'],
            'judges' => ['required', 'string', 'max:500'],
            'bench' => ['boolean'],
            'apex_court_case' => ['nullable', 'string', 'max:255'],
            'apex_court_status' => ['nullable', 'string', 'max:255'],
            'citation' => ['nullable', 'string', 'max:120'],
            'other_citation' => ['nullable', 'string', 'max:120'],
            'sc_citation' => ['nullable', 'string', 'max:120'],
            'tag_line' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'decision_date' => ['nullable', 'date'],
            'uploaded_on' => ['required', 'date'],
            'text_mode' => ['required', Rule::in(['pdf', 'link'])],
            'pdf_link' => [Rule::requiredIf($link && blank($request->input('source_url'))), 'nullable', 'url:https,http', 'max:1000'],
            'source_url' => ['nullable', 'url:https,http', 'max:1000'],
            'is_published' => ['boolean'],
            'is_reported' => ['boolean'],
            'pdf' => [! $link && ! $hasUploadedPdf ? 'required' : 'nullable', 'file', 'mimes:pdf', 'max:20480'],
            'remove_pdf' => ['boolean'],
        ], ['pdf_link.required' => __('Add the PDF link, the source page link, or both.')]);

        $deleteUploaded = function () use ($judgment): void {
            if ($judgment->pdf_path && ! $judgment->pdfIsLink()) {
                Storage::disk('public')->delete($judgment->pdf_path);
            }
            // A new PDF or link replaces any scraper-stored file too, so it is removed from the private disk.
            if ($judgment->hasStoredPdf()) {
                Storage::disk('local')->delete($judgment->stored_pdf_path);
                $judgment->forceFill(['stored_pdf_path' => null, 'source_pdf_url' => null, 'pdf_bytes' => null]);
            }
            $judgment->pdf_path = null;
        };

        // Link mode: the PDF lives on the court website (pdf_link) and/or a source page; an uploaded file is removed.
        if ($link) {
            if ($hasUploadedPdf || blank($data['pdf_link'] ?? null)) {
                $deleteUploaded();
            }
            $judgment->pdf_path = $data['pdf_link'] ?? null;
        } elseif ($request->hasFile('pdf')) {
            $deleteUploaded();
            $judgment->pdf_path = $request->file('pdf')->store('judgments', 'public');
        } elseif ($request->boolean('remove_pdf')) {
            $deleteUploaded();
        }

        // A court PDF named after its citation (2026LHC8777.pdf) fills an empty citation.
        $data['citation'] = filled($data['citation'] ?? null) ? trim($data['citation']) : ReportedJudgment::citationFromPdfUrl($data['pdf_link'] ?? null);

        $judgment->fill(collect($data)->except(['pdf', 'pdf_link', 'remove_pdf', 'text_mode'])->all())->save();
        Cache::forget('judgment-counts');
    }
}
