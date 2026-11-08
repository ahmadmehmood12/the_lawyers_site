<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\Attendance;
use App\Enums\CaseStatus;
use App\Enums\HearingStatus;
use App\Enums\HearingType;
use App\Http\Controllers\Controller;
use App\Models\DiaryEntry;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Services\Access\OrganizationAccess;
use App\Services\Pdf\PdfRenderer;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Court diary: day/week/month/agenda views plus mobile "Court Mode".
 * Members without diary.view_all only see their own hearings and hearings
 * on cases assigned to them. See docs/Modules/Court-Diary.md.
 */
class DiaryController extends Controller
{
    public function index(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        abort_unless($access->allows($user, $organization, 'hearings.view'), 403);

        $view = in_array($request->query('view'), ['day', 'week', 'month', 'agenda'], true) ? $request->query('view') : 'day';
        $date = $this->parseDate($request->query('date'));
        [$from, $to] = match ($view) {
            'week' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'month' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            'agenda' => [$date->copy(), $date->copy()->addDays(30)],
            default => [$date->copy(), $date->copy()],
        };

        $hearings = $this->query($request)
            ->whereBetween('hearing_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('hearing_date')->orderByRaw('hearing_time IS NULL, hearing_time')
            ->limit(500)->get();

        $month = $date->format('Y-m');
        $monthCounts = $this->query($request)
            ->whereBetween('hearing_date', [$date->copy()->startOfMonth()->toDateString(), $date->copy()->endOfMonth()->toDateString()])
            ->where('status', HearingStatus::Scheduled->value)
            ->selectRaw('hearing_date, COUNT(*) as total')->groupBy('hearing_date')->pluck('total', 'hearing_date')
            ->mapWithKeys(fn ($total, $day) => [Carbon::parse($day)->toDateString() => (int) $total]);

        $entries = DiaryEntry::query()->forOrganization($organization)
            ->when(! $access->allows($user, $organization, 'diary.view_all'), fn ($q) => $q->where('user_id', $user->id))
            ->whereBetween('entry_date', [$from->toDateString(), $to->toDateString()])
            ->with('legalCase:id,title,reference')->orderBy('entry_date')->orderBy('entry_time')->get();

        return Inertia::render('Workspace/Diary/Index', [
            'view' => $view,
            'date' => $date->toDateString(),
            'month' => $month,
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'hearings' => $hearings->map(fn (Hearing $h) => $this->present($h)),
            'entries' => $entries->map(fn (DiaryEntry $e) => ['id' => $e->id, 'entry_date' => $e->entry_date->toDateString(), 'entry_time' => $e->entry_time ? substr($e->entry_time, 0, 5) : null, 'title' => $e->title, 'notes' => $e->notes, 'case' => $e->legalCase ? ['id' => $e->legalCase->id, 'title' => $e->legalCase->title] : null]),
            'monthCounts' => $monthCounts,
            'filters' => $request->only(['court_id', 'district_id', 'judge', 'lawyer_id', 'case_id', 'status']),
            'options' => [
                'courts' => ReferenceOptions::courts(),
                'districts' => ReferenceOptions::districts(),
                'lawyers' => $access->allows($user, $organization, 'diary.view_all') ? ReferenceOptions::members($organization, true) : [],
                'cases' => LegalCase::query()->visibleTo($user, $organization)->whereIn('status', CaseStatus::openValues())->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
                'attendance' => Attendance::options(),
                'hearingTypes' => HearingType::options(),
            ],
            'can' => [
                'manage' => $access->allows($user, $organization, 'hearings.manage'),
                'record' => $access->allows($user, $organization, 'hearings.record_outcome'),
                'upload' => $access->allows($user, $organization, 'documents.upload'),
                'tasks' => $access->allows($user, $organization, 'tasks.manage'),
                'viewAll' => $access->allows($user, $organization, 'diary.view_all'),
            ],
        ]);
    }

    /** Printable daily cause list as PDF (Urdu-capable via mPDF). */
    public function pdf(Request $request, OrganizationAccess $access, PdfRenderer $pdf): HttpResponse
    {
        $organization = $this->organization();
        abort_unless($access->allows($request->user(), $organization, 'hearings.view'), 403);
        $date = $this->parseDate($request->query('date'));

        $hearings = $this->query($request)->whereDate('hearing_date', $date)->orderByRaw('hearing_time IS NULL, hearing_time')->get();
        activity('exports')->causedBy($request->user())->withProperties(['date' => $date->toDateString(), 'count' => $hearings->count()])->log('diary_pdf');

        return $pdf->download('pdf.daily-diary', [
            'organization' => $organization,
            'date' => $date,
            'hearings' => $hearings,
            'user' => $request->user(),
        ], 'court-diary-'.$date->toDateString().'.pdf');
    }

    public function storeEntry(Request $request, OrganizationAccess $access): RedirectResponse
    {
        $organization = $this->organization();
        abort_unless($access->allows($request->user(), $organization, 'hearings.view'), 403);

        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'entry_time' => ['nullable', 'date_format:H:i'],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'legal_case_id' => ['nullable', 'integer'],
        ]);

        if (! empty($validated['legal_case_id'])) {
            $case = LegalCase::query()->forOrganization($organization)->findOrFail($validated['legal_case_id']);
            $this->authorize('view', $case);
        }

        DiaryEntry::create([...$validated, 'organization_id' => $organization->id, 'user_id' => $request->user()->id]);

        return back()->with('success', __('Diary note added.'));
    }

    public function destroyEntry(Request $request, DiaryEntry $entry): RedirectResponse
    {
        abort_unless($entry->user_id === $request->user()->id && $entry->belongsToOrganization($this->organization()), 404);
        $entry->delete();

        return back()->with('success', __('Diary note removed.'));
    }

    /**
     * Hearings visible to the current user with the request's filters applied.
     *
     * @return Builder<Hearing>
     */
    private function query(Request $request): Builder
    {
        $organization = $this->organization();
        $user = $request->user();
        $access = app(OrganizationAccess::class);
        $seeAll = $access->allows($user, $organization, 'diary.view_all') || $access->allows($user, $organization, 'cases.view_all');

        return Hearing::query()->forOrganization($organization)
            ->with(['legalCase:id,title,reference,case_number', 'legalCase.clients:id,name,phone', 'court:id,name,district_id', 'judge:id,name', 'assignedLawyer:id,name'])
            ->when(! $seeAll, fn ($q) => $q->where(fn ($w) => $w->where('assigned_lawyer_id', $user->id)
                ->orWhereHas('legalCase.lawyers', fn ($l) => $l->whereKey($user->id))))
            ->when($request->integer('court_id'), fn ($q, $id) => $q->where('court_id', $id))
            ->when($request->integer('district_id'), fn ($q, $id) => $q->whereHas('court', fn ($c) => $c->where('district_id', $id)))
            ->when($request->string('judge')->trim()->toString(), fn ($q, $judge) => $q->where(fn ($w) => $w->where('judge_name', 'like', "%{$judge}%")->orWhereHas('judge', fn ($j) => $j->where('name', 'like', "%{$judge}%"))))
            ->when($seeAll && $request->integer('lawyer_id'), fn ($q) => $q->where('assigned_lawyer_id', $request->integer('lawyer_id')))
            ->when($request->integer('case_id'), fn ($q, $id) => $q->where('legal_case_id', $id))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status));
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Hearing $h): array
    {
        return [
            ...CaseController::hearingSummary($h),
            'case' => ['id' => $h->legalCase->id, 'title' => $h->legalCase->title, 'reference' => $h->legalCase->reference, 'case_number' => $h->legalCase->case_number],
            'clients' => $h->legalCase->clients->map(fn ($c) => ['name' => $c->name, 'phone' => $c->phone]),
            'order_passed' => $h->order_passed,
            'adjournment_reason' => $h->adjournment_reason,
            'next_hearing_date' => $h->next_hearing_date?->toDateString(),
        ];
    }

    private function parseDate(mixed $value): Carbon
    {
        try {
            return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? Carbon::parse($value)->startOfDay() : today();
        } catch (\Throwable) {
            return today();
        }
    }
}
