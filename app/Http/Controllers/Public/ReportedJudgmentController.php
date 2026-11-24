<?php

namespace App\Http\Controllers\Public;

use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Models\ReportedJudgment;
use App\Models\User;
use App\Services\Judgments\JudgmentSnippets;
use App\Services\Subscriptions\SubscriptionService;
use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/** Public: judgments approved for reporting, High Court wise, with the search filters courts use. */
class ReportedJudgmentController extends Controller
{
    public function index(Request $request, ?string $embedded = null): Response
    {
        $court = array_key_exists((string) $request->query('court'), ReportedJudgment::COURTS) ? (string) $request->query('court') : null;
        $filters = $request->only(['court', 'year', 'judge', 'bench', 'pair', 'citation', 'case', 'title', 'text', 'decided_from', 'decided_to', 'uploaded_from', 'uploaded_to']);

        // Full-text / keyword search over the extracted PDF text (judgment_pages + judgment_keywords).
        $textMatch = filled($filters['text'] ?? null) ? self::textMatch((string) $filters['text']) : null;

        $judgments = self::filtered(ReportedJudgment::query()->listed(), $filters)
            ->when($textMatch !== null, fn ($q) => $q->whereIn('id', $textMatch['ids'] ?: [0]))
            // A text search ranks by relevance (most relevant judgment first); other searches are newest first.
            ->when($textMatch !== null && $textMatch['ids'] !== [], fn ($q) => $q->orderByRaw('FIELD(id, '.implode(',', $textMatch['ids']).') ASC'))
            // Searching a citation shows that judgment first, then the judgments that cite it.
            ->when(filled($filters['citation'] ?? null), fn ($q) => $q->orderByRaw('('.self::compactColumn('citation').' = ? OR '.self::compactColumn('other_citation').' = ? OR '.self::compactColumn('sc_citation').' = ?) DESC', array_fill(0, 3, self::compactCitation((string) $filters['citation']))))
            ->orderByDesc('uploaded_on')->orderByDesc('id')
            ->paginate(25)->withQueryString();

        // The line around each hit (keyword in context), only for the judgments on this page.
        $snippets = $textMatch === null ? [] : app(JudgmentSnippets::class)->for($judgments->pluck('id')->all(), $textMatch['pages'], $textMatch['terms']);
        $judgments->through(fn (ReportedJudgment $j) => $textMatch === null ? $j->toListItem() : [
            ...$j->toListItem(),
            'match_pages' => $textMatch['pages'][$j->id] ?? [],
            'match_snippets' => $snippets[$j->id] ?? [],
        ]);

        $counts = Cache::remember('judgment-counts', now()->addMinutes(10), fn () => ReportedJudgment::query()->listed()
            ->selectRaw('court, COUNT(*) as total')->groupBy('court')->pluck('total', 'court')->all());

        return Inertia::render('Public/Judgments/Index', [
            'judgments' => $judgments,
            'courts' => collect(ReportedJudgment::COURTS)->map(fn ($c, $key) => [...$c, 'key' => $key, 'count' => (int) ($counts[$key] ?? 0)])->values(),
            // One entry per judge (division benches split into their judges), all courts or the selected one.
            'judges' => ReportedJudgment::judgeOptions($court),
            // Division-bench judge pairs: the distinct judges texts naming 2+ judges.
            'pairs' => ReportedJudgment::benchOptions($court),
            'years' => ReportedJudgment::query()->listed()->selectRaw('DISTINCT YEAR(COALESCE(decision_date, uploaded_on)) as y')->orderByDesc('y')->pluck('y'),
            'filters' => $filters,
            'canonical' => route('judgments.index'),
            'embedded' => $embedded,
            'canDownloadPdf' => self::canDownloadPdf($request->user()),
        ]);
    }

    public function show(ReportedJudgment $judgment, ?string $embedded = null): Response
    {
        abort_unless($judgment->is_published && $judgment->is_reported, 404);
        $judgment->increment('views');

        return Inertia::render('Public/Judgments/Show', [
            'judgment' => [
                ...$judgment->toListItem(),
                'remarks' => $judgment->remarks,
                'summary' => $judgment->summary,
            ],
            'related' => ReportedJudgment::query()->listed()->where('court', $judgment->court)->whereKeyNot($judgment->id)
                ->where('judges', $judgment->judges)->latest('uploaded_on')->limit(5)->get()->map->toListItem(),
            'canonical' => route('judgments.show', $judgment),
            'embedded' => $embedded,
            'canDownloadPdf' => self::canDownloadPdf(request()->user()),
        ]);
    }

    /**
     * Whether the viewer may download judgment PDFs: their current organization's plan must have the
     * "Download judgment PDFs" feature enabled. Guests (and users without a plan) get view-only access.
     */
    public static function canDownloadPdf(?User $user): bool
    {
        $organization = $user?->currentOrganization;

        return $organization !== null && app(SubscriptionService::class)->enabled($organization, PlanFeature::JudgmentPdfDownload);
    }

    /** Stream the stored judgment PDF inline (the website's viewer). Everyone may view a reported judgment. */
    public function viewPdf(ReportedJudgment $judgment): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($judgment->is_published && $judgment->is_reported, 404);

        if ($judgment->hasStoredPdf()) {
            abort_unless(Storage::disk('local')->exists($judgment->stored_pdf_path), 404);

            return Storage::disk('local')->response($judgment->stored_pdf_path, $this->pdfFilename($judgment), ['Content-Type' => 'application/pdf']);
        }

        abort_unless(filled($judgment->pdf_path), 404);

        return redirect()->away($judgment->pdfIsLink() ? $judgment->pdf_path : PublicFile::url($judgment->pdf_path));
    }

    /** Download the judgment PDF as an attachment. Gated by the viewer's plan (403 otherwise). */
    public function downloadPdf(Request $request, ReportedJudgment $judgment): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($judgment->is_published && $judgment->is_reported, 404);
        abort_unless(self::canDownloadPdf($request->user()), 403);

        if ($judgment->hasStoredPdf()) {
            abort_unless(Storage::disk('local')->exists($judgment->stored_pdf_path), 404);

            return Storage::disk('local')->download($judgment->stored_pdf_path, $this->pdfFilename($judgment));
        }

        abort_unless(filled($judgment->pdf_path) && ! $judgment->pdfIsLink(), 404);

        return redirect()->away(PublicFile::url($judgment->pdf_path));
    }

    private function pdfFilename(ReportedJudgment $judgment): string
    {
        $base = Str::slug($judgment->citation ?: ($judgment->court.' '.$judgment->case_number)) ?: 'judgment';

        return $base.'.pdf';
    }

    /**
     * @param  Builder<ReportedJudgment>  $query
     * @param  array<string, mixed>  $f
     * @return Builder<ReportedJudgment>
     */
    public static function filtered(Builder $query, array $f): Builder
    {
        $like = fn (string $v) => '%'.str_replace(['%', '_'], ['\%', '\_'], trim($v)).'%';

        return $query
            ->when(array_key_exists((string) ($f['court'] ?? ''), ReportedJudgment::COURTS), fn ($q) => $q->where('court', $f['court']))
            ->when(is_numeric($f['year'] ?? null), fn ($q) => $q->whereRaw('YEAR(COALESCE(decision_date, uploaded_on)) = ?', [(int) $f['year']]))
            // A judge matches every judgment they sat on, alone or in a bench (whole-name match, so
            // "Muhammad Asif" does not also match "Muhammad Asif Khan").
            ->when(filled($f['judge'] ?? null), fn ($q) => self::whereJudge($q, (string) $f['judge']))
            // bench = division | single (D.B. / S.B.).
            ->when(in_array($f['bench'] ?? null, ['division', 'single'], true), fn ($q) => $q->where('bench', $f['bench'] === 'division'))
            // pair = "Name A|Name B": only the judgments of that division bench (every judge of the pair on it).
            ->when(str_contains((string) ($f['pair'] ?? ''), '|'), function ($q) use ($f): void {
                $q->where('bench', true);
                foreach (array_filter(array_map('trim', explode('|', (string) $f['pair']))) as $name) {
                    self::whereJudge($q, $name);
                }
            })
            ->when(filled($f['citation'] ?? null), function ($q) use ($f, $like) {
                // "2026 LHC 8777", "2026LHC8777" and "PLD 2026 Lahore 172" all match; case law cited inside a judgment counts too.
                $compact = '%'.self::compactCitation((string) $f['citation']).'%';

                $q->where(fn ($w) => $w->whereRaw(self::compactColumn('citation').' LIKE ?', [$compact])
                    ->orWhereRaw(self::compactColumn('other_citation').' LIKE ?', [$compact])
                    ->orWhereRaw(self::compactColumn('sc_citation').' LIKE ?', [$compact])
                    ->orWhereRaw(self::compactColumn('cited_citations').' LIKE ?', [$compact])
                    ->orWhere('tag_line', 'like', $like($f['citation']))
                    ->orWhere('remarks', 'like', $like($f['citation'])));
            })
            ->when(filled($f['case'] ?? null), fn ($q) => $q->where(fn ($w) => $w->where('case_number', 'like', $like($f['case']))->orWhere('case_type', 'like', $like($f['case']))))
            ->when(filled($f['title'] ?? null), fn ($q) => $q->where('title', 'like', $like($f['title'])))
            ->when(filled($f['decided_from'] ?? null), fn ($q) => $q->whereDate('decision_date', '>=', $f['decided_from']))
            ->when(filled($f['decided_to'] ?? null), fn ($q) => $q->whereDate('decision_date', '<=', $f['decided_to']))
            ->when(filled($f['uploaded_from'] ?? null), fn ($q) => $q->whereDate('uploaded_on', '>=', $f['uploaded_from']))
            ->when(filled($f['uploaded_to'] ?? null), fn ($q) => $q->whereDate('uploaded_on', '<=', $f['uploaded_to']));
    }

    /**
     * Judgments this judge sat on (alone or in a bench), under any spelling of the name found in the PDFs.
     * Whole-name match, so "Muhammad Asif" does not also match "Muhammad Asif Khan".
     *
     * @param  Builder<ReportedJudgment>  $query
     */
    private static function whereJudge(Builder $query, string $name): void
    {
        $variants = array_map(fn (string $v) => preg_quote(trim($v)), ReportedJudgment::judgeVariants($name));
        $query->whereRaw('judges REGEXP ?', ['\\b('.implode('|', $variants).')\\b']);
    }

    /**
     * Search the extracted PDF text and keywords for a phrase or keywords. Returns the matching
     * judgment ids (most relevant first), the pages each phrase hit, and the keywords that matched.
     * Phrases wrapped in "quotes" are matched as exact phrases; bare words must all appear (AND).
     *
     * @return array{ids: list<int>, pages: array<int, list<int>>, keywords: array<int, list<string>>, terms: array{phrases: list<string>, words: list<string>}}
     */
    public static function textMatch(string $query): array
    {
        $query = trim($query);
        $phrases = [];
        preg_match_all('/"([^"]+)"/', $query, $quoted);
        foreach ($quoted[1] as $phrase) {
            $clean = trim(preg_replace('/[+\-><()~*@"]+/', ' ', $phrase) ?? '');
            if ($clean !== '') {
                $phrases[] = $clean;
            }
        }
        $rest = preg_replace('/"[^"]*"/', ' ', $query) ?? '';
        $words = array_values(array_filter(preg_split('/\s+/', preg_replace('/[+\-><()~*@"]+/', ' ', $rest) ?? '') ?: [], fn ($w) => mb_strlen($w) >= 2));

        $terms = [...array_map(fn ($p) => '"'.$p.'"', $phrases), ...array_map(fn ($w) => '+'.$w.'*', $words)];
        if ($terms === []) {
            return ['ids' => [], 'pages' => [], 'keywords' => [], 'terms' => ['phrases' => [], 'words' => []]];
        }
        $boolean = implode(' ', $terms);

        // Pages whose text matches, with a relevance score and the page numbers that hit (capped for the listing).
        $pageRows = DB::table('judgment_pages')
            ->selectRaw('reported_judgment_id AS jid, MAX(MATCH(body) AGAINST(? IN BOOLEAN MODE)) AS score, GROUP_CONCAT(page_number ORDER BY page_number) AS pages', [$boolean])
            ->whereRaw('MATCH(body) AGAINST(? IN BOOLEAN MODE)', [$boolean])
            ->groupBy('reported_judgment_id')
            ->limit(500)
            ->get();

        $scores = [];
        $pages = [];
        foreach ($pageRows as $row) {
            $scores[(int) $row->jid] = (float) $row->score;
            $pages[(int) $row->jid] = array_slice(array_map('intval', explode(',', (string) $row->pages)), 0, 20);
        }

        // Exact keyword matches (supplementary): a stored keyword equals a search word or contains a phrase.
        $keywords = [];
        $kwQuery = DB::table('judgment_keywords')
            ->selectRaw('reported_judgment_id AS jid, GROUP_CONCAT(DISTINCT keyword) AS kws')
            ->where(function ($w) use ($words, $phrases) {
                if ($words !== []) {
                    $w->orWhereIn('keyword', array_map(fn ($word) => mb_strtolower($word), $words));
                }
                foreach ([...$phrases, ...$words] as $term) {
                    $w->orWhere('keyword', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], mb_strtolower($term)).'%');
                }
            })
            ->groupBy('reported_judgment_id')
            ->limit(500)
            ->get();

        foreach ($kwQuery as $row) {
            $jid = (int) $row->jid;
            $keywords[$jid] = array_slice(array_values(array_unique(array_filter(explode(',', (string) $row->kws)))), 0, 12);
            $scores[$jid] = ($scores[$jid] ?? 0) + 0.5; // a keyword hit alone still qualifies the judgment
        }

        arsort($scores);
        $ids = array_map('intval', array_keys($scores));

        return ['ids' => $ids, 'pages' => $pages, 'keywords' => $keywords, 'terms' => ['phrases' => $phrases, 'words' => $words]];
    }

    /** Court names in law report citations, compared in their short form ("PLD 2026 Lahore 172" = "PLD 2026 Lah. 172"). */
    private const COURT_SHORT = ['supremecourt' => 'sc', 'lahore' => 'lah', 'karachi' => 'kar', 'peshawar' => 'pesh', 'islamabad' => 'isl', 'balochistan' => 'bal'];

    /** Lower case, without spaces, dots or commas, short court names: "PLD 2026 Lahore 172" -> "pld2026lah172". */
    public static function compactCitation(string $value): string
    {
        $compact = strtr(preg_replace('/[\s.,]+/', '', mb_strtolower(trim($value))) ?? '', self::COURT_SHORT);

        return str_replace(['%', '_'], ['\\%', '\\_'], $compact);
    }

    /** SQL for the same normalisation on a fixed column name (never user input). */
    private static function compactColumn(string $column): string
    {
        $sql = "LOWER(REPLACE(REPLACE(REPLACE(COALESCE({$column}, ''), ' ', ''), '.', ''), ',', ''))";

        foreach (self::COURT_SHORT as $long => $short) {
            $sql = "REPLACE({$sql}, '{$long}', '{$short}')";
        }

        return $sql;
    }
}
