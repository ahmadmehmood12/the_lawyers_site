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
    public const CSV_COLUMNS = ['court', 'case_type', 'case_number', 'title', 'judges', 'citation', 'tag_line', 'decision_date', 'uploaded_on', 'source_url'];

    public function index(Request $request): Response
    {
        $filters = $request->only(['court', 'search']);

        return Inertia::render('Admin/Judgments', [
            'rows' => PublicJudgments::filtered(ReportedJudgment::query(), ['court' => $filters['court'] ?? null, 'title' => $filters['search'] ?? null])
                ->orderByDesc('uploaded_on')->orderByDesc('id')->paginate(25)->withQueryString()
                ->through(fn (ReportedJudgment $j) => [...$j->toListItem(), 'is_published' => $j->is_published, 'views' => $j->views]),
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
        if ($judgment->pdf_path) {
            Storage::disk('public')->delete($judgment->pdf_path);
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
            ReportedJudgment::query()->updateOrCreate(
                ['court' => $court, 'case_number' => trim($data['case_number']), 'title' => trim($data['title'])],
                [
                    'case_type' => trim((string) ($data['case_type'] ?? '')) ?: 'Case', 'judges' => trim((string) ($data['judges'] ?? '')) ?: '—',
                    'citation' => ($data['citation'] ?? null) ?: null, 'tag_line' => ($data['tag_line'] ?? null) ?: null,
                    'decision_date' => $date($data['decision_date'] ?? null), 'uploaded_on' => $date($data['uploaded_on'] ?? null) ?? today()->toDateString(),
                    'source_url' => filter_var($data['source_url'] ?? null, FILTER_VALIDATE_URL) ?: null, 'is_published' => true,
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
        $data = $request->validate([
            'court' => ['required', Rule::in(array_keys(ReportedJudgment::COURTS))],
            'case_type' => ['required', 'string', 'max:160'],
            'case_number' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:500'],
            'judges' => ['required', 'string', 'max:500'],
            'citation' => ['nullable', 'string', 'max:120'],
            'tag_line' => ['nullable', 'string', 'max:2000'],
            'decision_date' => ['nullable', 'date'],
            'uploaded_on' => ['required', 'date'],
            'source_url' => ['nullable', 'url:https,http', 'max:500'],
            'is_published' => ['boolean'],
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
            'remove_pdf' => ['boolean'],
        ]);

        if ($request->boolean('remove_pdf') && $judgment->pdf_path) {
            Storage::disk('public')->delete($judgment->pdf_path);
            $judgment->pdf_path = null;
        }
        if ($request->hasFile('pdf')) {
            if ($judgment->pdf_path) {
                Storage::disk('public')->delete($judgment->pdf_path);
            }
            $judgment->pdf_path = $request->file('pdf')->store('judgments', 'public');
        }

        $judgment->fill(collect($data)->except(['pdf', 'remove_pdf'])->all())->save();
        Cache::forget('judgment-counts');
    }
}
