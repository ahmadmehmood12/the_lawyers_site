<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ReportedJudgment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/** Public: judgments approved for reporting, High Court wise, with the search filters courts use. */
class ReportedJudgmentController extends Controller
{
    public function index(Request $request): Response
    {
        $court = array_key_exists((string) $request->query('court'), ReportedJudgment::COURTS) ? (string) $request->query('court') : null;
        $filters = $request->only(['court', 'year', 'judge', 'citation', 'case', 'title', 'decided_from', 'decided_to', 'uploaded_from', 'uploaded_to']);

        $judgments = self::filtered(ReportedJudgment::query()->where('is_published', true), $filters)
            ->orderByDesc('uploaded_on')->orderByDesc('id')
            ->paginate(25)->withQueryString()
            ->through(fn (ReportedJudgment $j) => $j->toListItem());

        $counts = Cache::remember('judgment-counts', now()->addMinutes(10), fn () => ReportedJudgment::query()->where('is_published', true)
            ->selectRaw('court, COUNT(*) as total')->groupBy('court')->pluck('total', 'court')->all());

        return Inertia::render('Public/Judgments/Index', [
            'judgments' => $judgments,
            'courts' => collect(ReportedJudgment::COURTS)->map(fn ($c, $key) => [...$c, 'key' => $key, 'count' => (int) ($counts[$key] ?? 0)])->values(),
            'judges' => ReportedJudgment::query()->where('is_published', true)->when($court, fn ($q) => $q->where('court', $court))
                ->distinct()->orderBy('judges')->limit(300)->pluck('judges'),
            'years' => ReportedJudgment::query()->where('is_published', true)->selectRaw('DISTINCT YEAR(COALESCE(decision_date, uploaded_on)) as y')->orderByDesc('y')->pluck('y'),
            'filters' => $filters,
            'canonical' => route('judgments.index'),
        ]);
    }

    public function show(ReportedJudgment $judgment): Response
    {
        abort_unless($judgment->is_published, 404);
        $judgment->increment('views');

        return Inertia::render('Public/Judgments/Show', [
            'judgment' => $judgment->toListItem(),
            'related' => ReportedJudgment::query()->where('is_published', true)->where('court', $judgment->court)->whereKeyNot($judgment->id)
                ->where('judges', $judgment->judges)->latest('uploaded_on')->limit(5)->get()->map->toListItem(),
            'canonical' => route('judgments.show', $judgment),
        ]);
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
            ->when(filled($f['judge'] ?? null), fn ($q) => $q->where('judges', 'like', $like($f['judge'])))
            ->when(filled($f['citation'] ?? null), fn ($q) => $q->where(fn ($w) => $w->where('citation', 'like', $like($f['citation']))->orWhere('tag_line', 'like', $like($f['citation']))))
            ->when(filled($f['case'] ?? null), fn ($q) => $q->where(fn ($w) => $w->where('case_number', 'like', $like($f['case']))->orWhere('case_type', 'like', $like($f['case']))))
            ->when(filled($f['title'] ?? null), fn ($q) => $q->where('title', 'like', $like($f['title'])))
            ->when(filled($f['decided_from'] ?? null), fn ($q) => $q->whereDate('decision_date', '>=', $f['decided_from']))
            ->when(filled($f['decided_to'] ?? null), fn ($q) => $q->whereDate('decision_date', '<=', $f['decided_to']))
            ->when(filled($f['uploaded_from'] ?? null), fn ($q) => $q->whereDate('uploaded_on', '>=', $f['uploaded_from']))
            ->when(filled($f['uploaded_to'] ?? null), fn ($q) => $q->whereDate('uploaded_on', '<=', $f['uploaded_to']));
    }
}
