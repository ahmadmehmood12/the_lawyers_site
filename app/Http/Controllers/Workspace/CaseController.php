<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\Attendance;
use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\DocumentCategory;
use App\Enums\HearingType;
use App\Enums\PartyRole;
use App\Enums\PlanFeature;
use App\Enums\Priority;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\CaseRequest;
use App\Models\Activity;
use App\Models\Conversation;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Services\Access\OrganizationAccess;
use App\Services\Cases\CaseService;
use App\Services\Subscriptions\SubscriptionService;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Case file. The show page is split into sections (?tab=) and only the active
 * section's data is loaded. See docs/Modules/Cases.md.
 */
class CaseController extends Controller
{
    public const TABS = ['overview', 'parties', 'hearings', 'documents', 'tasks', 'finance', 'communications', 'timeline', 'audit'];

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', LegalCase::class);
        [$sort, $direction] = $this->sorting(['reference', 'title', 'next_hearing_at', 'created_at', 'status'], 'created_at');
        $organization = $this->organization();

        $cases = LegalCase::query()
            ->visibleTo($request->user(), $organization)
            ->with(['court:id,name', 'clients:id,name', 'lawyers:id,name'])
            ->when($request->string('search')->trim()->toString(), function ($q, string $search): void {
                $q->where(fn ($w) => $w->where('title', 'like', "%{$search}%")
                    ->orWhere('case_number', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('fir_number', 'like', "%{$search}%")
                    ->orWhereHas('clients', fn ($c) => $c->where('name', 'like', "%{$search}%")));
            })
            ->when($request->string('status')->toString(), function ($q, string $status): void {
                $status === 'open' ? $q->whereIn('status', CaseStatus::openValues()) : $q->where('status', $status);
            })
            ->when($request->string('case_type')->toString(), fn ($q, $type) => $q->where('case_type', $type))
            ->when($request->integer('court_id'), fn ($q, $court) => $q->where('court_id', $court))
            ->when($request->integer('lawyer_id'), fn ($q, $lawyer) => $q->whereHas('lawyers', fn ($l) => $l->whereKey($lawyer)))
            ->orderBy($sort, $direction)->orderByDesc('id')
            ->paginate(20)->withQueryString()
            ->through(fn (LegalCase $c) => [
                'id' => $c->id, 'reference' => $c->reference, 'title' => $c->title, 'case_number' => $c->case_number,
                'case_type_label' => $c->case_type->label(), 'status' => $c->status->value, 'status_label' => $c->status->label(),
                'priority' => $c->priority->value, 'priority_label' => $c->priority->label(),
                'court' => $c->court?->name, 'clients' => $c->clients->pluck('name'), 'lawyers' => $c->lawyers->pluck('name'),
                'next_hearing_at' => $c->next_hearing_at?->toIso8601String(),
            ]);

        return Inertia::render('Workspace/Cases/Index', [
            'cases' => $cases,
            'filters' => $request->only(['search', 'status', 'case_type', 'court_id', 'lawyer_id', 'sort', 'direction']),
            'options' => [
                'statuses' => CaseStatus::options(),
                'types' => CaseType::options(),
                'courts' => ReferenceOptions::courts(),
                'lawyers' => ReferenceOptions::members($organization, true),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', LegalCase::class);

        return Inertia::render('Workspace/Cases/Form', [
            'legalCase' => null,
            'preselectedClientId' => $request->integer('client_id') ?: null,
            ...$this->formOptions(),
        ]);
    }

    public function store(CaseRequest $request, CaseService $cases, SubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorize('create', LegalCase::class);
        $organization = $this->organization();

        if (! $subscriptions->canAdd($organization, PlanFeature::MaxActiveCases)) {
            return back()->with('error', __('Your plan’s active case limit has been reached. Close cases or upgrade your plan.'));
        }

        $data = $request->validated();
        if (! $request->user()->can('assign', new LegalCase(['organization_id' => $organization->id]))) {
            $data['lawyer_ids'] = [$request->user()->id];
            $data['lead_lawyer_id'] = $request->user()->id;
        }

        $case = $cases->create($organization, $request->user(), $data);

        return redirect()->route('cases.show', $case)->with('success', __('Case :ref created.', ['ref' => $case->reference]));
    }

    public function show(Request $request, LegalCase $case, OrganizationAccess $access): Response
    {
        $this->authorize('view', $case);
        $tab = in_array($request->query('tab'), self::TABS, true) ? $request->query('tab') : 'overview';
        $user = $request->user();
        $can = fn (string $permission) => $access->allows($user, $case->organization_id, $permission);

        $case->load(['court:id,name', 'judge:id,name', 'specialization:id,name', 'district:id,name', 'province:id,name', 'clients:id,name,phone,user_id', 'lawyers:id,name', 'nextHearing']);

        return Inertia::render('Workspace/Cases/Show', [
            'tab' => $tab,
            'legalCase' => [
                ...$case->only(['id', 'reference', 'title', 'case_number', 'description', 'filing_year', 'jurisdiction', 'judge_name', 'courtroom', 'stage', 'professional_fee', 'fee_type', 'fir_number', 'police_station', 'legal_sections', 'bail_status', 'client_summary', 'share_with_client', 'outcome']),
                'case_type' => $case->case_type->value, 'case_type_label' => $case->case_type->label(),
                'status' => $case->status->value, 'status_label' => $case->status->label(),
                'priority' => $case->priority->value, 'priority_label' => $case->priority->label(),
                'filing_date' => $case->filing_date?->toDateString(), 'fir_date' => $case->fir_date?->toDateString(),
                'court' => $case->court?->name, 'court_id' => $case->court_id, 'judge' => $case->judge?->name ?? $case->judge_name, 'judge_id' => $case->judge_id,
                'specialization' => $case->specialization?->name, 'district' => $case->district?->name, 'province' => $case->province?->name,
                'is_criminal' => $case->case_type === CaseType::Criminal,
                'investigation_notes' => $case->investigation_notes,
                'strategy_notes' => $case->strategy_notes,
                'clients' => $case->clients->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone, 'is_primary' => (bool) $c->pivot->is_primary, 'has_portal' => $c->user_id !== null]),
                'lawyers' => $case->lawyers->map(fn ($l) => ['id' => $l->id, 'name' => $l->name, 'role' => $l->pivot->role]),
                'next_hearing' => $case->nextHearing ? $this->hearingSummary($case->nextHearing) : null,
                'archived_at' => $case->archived_at?->toIso8601String(),
                'created_at' => $case->created_at->toIso8601String(),
            ],
            'section' => fn () => $this->section($tab, $case, $request, $can),
            'counts' => [
                'hearings' => $case->hearings()->count(),
                'documents' => $can('documents.view') ? $case->documents()->count() : 0,
                'tasks' => $case->tasks()->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value])->count(),
            ],
            'can' => [
                'update' => $user->can('update', $case),
                'assign' => $user->can('assign', $case),
                'archive' => $user->can('archive', $case),
                'manageHearings' => $can('hearings.manage'),
                'recordOutcome' => $can('hearings.record_outcome'),
                'uploadDocuments' => $can('documents.upload'),
                'viewDocuments' => $can('documents.view'),
                'shareDocuments' => $can('documents.share'),
                'manageTasks' => $can('tasks.manage'),
                'manageExpenses' => $can('expenses.manage'),
                'viewFinance' => $can('finance.view'),
                'invoice' => $can('finance.invoice'),
                'message' => $can('messages.client'),
                'draft' => $can('drafts.manage'),
            ],
            'options' => [
                'hearingTypes' => HearingType::options(),
                'attendance' => Attendance::options(),
                'courts' => ReferenceOptions::courts(),
                'judges' => ReferenceOptions::judges(),
                'lawyers' => ReferenceOptions::members($case->organization, true),
                'members' => ReferenceOptions::members($case->organization),
                'priorities' => Priority::options(),
                'documentCategories' => DocumentCategory::options(),
                'taskStatuses' => TaskStatus::options(),
            ],
        ]);
    }

    public function edit(LegalCase $case): Response
    {
        $this->authorize('update', $case);
        $case->load(['clients:id', 'lawyers:id', 'parties']);

        return Inertia::render('Workspace/Cases/Form', [
            'legalCase' => [
                ...$case->only(['id', 'reference', 'title', 'case_number', 'description', 'filing_year', 'court_id', 'jurisdiction', 'province_id', 'district_id', 'judge_id', 'judge_name', 'courtroom', 'stage', 'professional_fee', 'fee_type', 'fir_number', 'police_station', 'legal_sections', 'bail_status', 'client_summary', 'share_with_client', 'specialization_id']),
                'case_type' => $case->case_type->value, 'status' => $case->status->value, 'priority' => $case->priority->value,
                'filing_date' => $case->filing_date?->toDateString(), 'fir_date' => $case->fir_date?->toDateString(),
                'investigation_notes' => $case->investigation_notes, 'strategy_notes' => $case->strategy_notes,
                'client_ids' => $case->clients->pluck('id'),
                'parties' => $case->parties->map(fn ($p) => $p->only(['role', 'name', 'father_name', 'address', 'counsel_name', 'is_our_side']) + ['role' => $p->role->value]),
            ],
            'preselectedClientId' => null,
            ...$this->formOptions(),
        ]);
    }

    public function update(CaseRequest $request, LegalCase $case, CaseService $cases): RedirectResponse
    {
        $this->authorize('update', $case);
        $data = $request->validated();
        unset($data['lawyer_ids'], $data['lead_lawyer_id']);

        $cases->update($case, $data);

        return redirect()->route('cases.show', $case)->with('success', __('Case updated.'));
    }

    public function updateLawyers(Request $request, LegalCase $case, CaseService $cases): RedirectResponse
    {
        $this->authorize('assign', $case);
        $validated = $request->validate([
            'lawyer_ids' => ['required', 'array', 'min:1'],
            'lawyer_ids.*' => ['integer', 'distinct'],
            'lead_lawyer_id' => ['required', 'integer', 'in_array:lawyer_ids.*'],
        ]);

        $cases->syncLawyers($case, $validated['lawyer_ids'], (int) $validated['lead_lawyer_id']);

        return back()->with('success', __('Case team updated.'));
    }

    public function archive(LegalCase $case, CaseService $cases): RedirectResponse
    {
        $this->authorize('archive', $case);
        $cases->update($case, ['status' => CaseStatus::Archived->value]);

        return redirect()->route('cases.index')->with('success', __('Case archived. Its full history is preserved.'));
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        $organization = $this->organization();

        return [
            'options' => [
                'types' => CaseType::options(),
                'statuses' => CaseStatus::options(),
                'priorities' => Priority::options(),
                'partyRoles' => PartyRole::options(),
                'courts' => ReferenceOptions::courts(),
                'judges' => ReferenceOptions::judges(),
                'specializations' => ReferenceOptions::specializations(),
                'provinces' => ReferenceOptions::provinces(),
                'districts' => ReferenceOptions::districts(),
                'clients' => ReferenceOptions::clients($organization),
                'lawyers' => ReferenceOptions::members($organization, true),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function hearingSummary(Hearing $h): array
    {
        return [
            'id' => $h->id,
            'hearing_date' => $h->hearing_date->toDateString(),
            'hearing_time' => $h->hearing_time ? substr($h->hearing_time, 0, 5) : null,
            'hearing_type' => $h->hearing_type?->value,
            'hearing_type_label' => $h->hearing_type?->label(),
            'purpose' => $h->purpose,
            'status' => $h->status->value,
            'status_label' => $h->status->label(),
            'court' => $h->court?->name,
            'court_id' => $h->court_id,
            'judge' => $h->judge?->name ?? $h->judge_name,
            'courtroom' => $h->courtroom,
            'assigned_lawyer' => $h->assignedLawyer?->name,
            'assigned_lawyer_id' => $h->assigned_lawyer_id,
            'preparation_notes' => $h->preparation_notes,
            'visible_to_client' => $h->visible_to_client,
            'has_outcome' => $h->hasOutcome(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function section(string $tab, LegalCase $case, Request $request, \Closure $can): ?array
    {
        $user = $request->user();

        return match ($tab) {
            'parties' => ['parties' => $case->parties()->get()->map(fn ($p) => [...$p->only(['id', 'name', 'father_name', 'address', 'counsel_name', 'is_our_side']), 'role' => $p->role->value, 'role_label' => $p->role->label()])],
            'hearings' => [
                'hearings' => $case->hearings()->with(['court:id,name', 'judge:id,name', 'assignedLawyer:id,name', 'recorder:id,name'])
                    ->orderByDesc('hearing_date')->orderByDesc('id')->get()
                    ->map(fn (Hearing $h) => [
                        ...self::hearingSummary($h),
                        ...$h->only(['proceedings', 'arguments', 'evidence', 'documents_submitted', 'order_passed', 'adjournment_reason', 'next_hearing_purpose', 'client_note', 'reschedule_reason', 'cancellation_reason', 'rescheduled_to_id', 'previous_hearing_id']),
                        'held_on' => $h->held_on?->toDateString(),
                        'next_hearing_date' => $h->next_hearing_date?->toDateString(),
                        'lawyer_attendance' => $h->lawyer_attendance?->label(),
                        'client_attendance' => $h->client_attendance?->label(),
                        'opposing_counsel_attendance' => $h->opposing_counsel_attendance?->label(),
                        'internal_notes' => $h->internal_notes,
                        'recorded_by' => $h->recorder?->name,
                        'outcome_recorded_at' => $h->outcome_recorded_at?->toIso8601String(),
                    ]),
                'diary' => $case->diaryEntries()->with('user:id,name')->latest('entry_date')->limit(50)->get()
                    ->map(fn ($d) => ['id' => $d->id, 'entry_date' => $d->entry_date->toDateString(), 'title' => $d->title, 'notes' => $d->notes, 'user' => $d->user->name]),
            ],
            'documents' => $can('documents.view') ? [
                'documents' => DocumentController::listFor($case->documents()->getQuery(), $user)->get()->map(fn ($d) => DocumentController::present($d)),
                'drafts' => $case->drafts()->latest('updated_at')->get(['id', 'title', 'status', 'version', 'updated_at'])
                    ->map(fn ($d) => ['id' => $d->id, 'title' => $d->title, 'status' => $d->status->value, 'status_label' => $d->status->label(), 'version' => $d->version, 'updated_at' => $d->updated_at->toIso8601String()]),
            ] : null,
            'tasks' => ['tasks' => $case->tasks()->with('assignee:id,name')->orderByRaw("status = 'done'")->orderBy('due_date')->get()->map(fn ($t) => TaskController::present($t))],
            'finance' => [
                'expenses' => $case->expenses()->with('recorder:id,name')->latest('incurred_on')->get()
                    ->map(fn ($e) => [...$e->only(['id', 'category', 'description', 'amount', 'is_billable', 'invoice_item_id']), 'incurred_on' => $e->incurred_on->toDateString(), 'recorded_by' => $e->recorder?->name]),
                'invoices' => $can('finance.view')
                    ? $case->invoices()->with('client:id,name')->latest('issue_date')->get()->map(fn ($i) => [...$i->only(['id', 'number', 'total', 'amount_paid']), 'issue_date' => $i->issue_date->toDateString(), 'status' => $i->status->value, 'status_label' => $i->status->label(), 'client' => $i->client->name])
                    : null,
            ],
            'communications' => [
                'conversations' => Conversation::query()->where('legal_case_id', $case->id)->forParticipant($user)->with('client:id,name')->latest('last_message_at')->get()
                    ->map(fn ($c) => ['id' => $c->id, 'subject' => $c->subject, 'client' => $c->client?->name, 'last_message_at' => $c->last_message_at?->toIso8601String()]),
                'appointments' => $case->appointments()->latest('starts_at')->limit(20)->get()
                    ->map(fn ($a) => ['id' => $a->id, 'starts_at' => $a->starts_at->toIso8601String(), 'status' => $a->status->value, 'status_label' => $a->status->label(), 'contact_name' => $a->contact_name]),
            ],
            'timeline' => ['events' => $case->events()->with('actor:id,name')->orderByDesc('occurred_at')->orderByDesc('id')->get()
                ->map(fn ($e) => ['id' => $e->id, 'type' => $e->type, 'title' => $e->title, 'description' => $e->description, 'occurred_at' => $e->occurred_at->toIso8601String(), 'actor' => $e->actor?->name, 'visible_to_client' => $e->visible_to_client])],
            'audit' => ['activities' => Activity::query()
                ->where(fn ($q) => $q->where(fn ($w) => $w->where('subject_type', $case->getMorphClass())->where('subject_id', $case->id))
                    ->orWhere(fn ($w) => $w->where('subject_type', (new Hearing)->getMorphClass())->whereIn('subject_id', $case->hearings()->select('id'))))
                ->with('causer:id,name')->latest('id')->limit(200)->get()
                ->map(fn ($a) => ['id' => $a->id, 'log' => $a->log_name, 'event' => $a->event ?? $a->description, 'subject' => class_basename($a->subject_type).' #'.$a->subject_id, 'changes' => $a->properties, 'causer' => $a->causer?->name, 'created_at' => $a->created_at->toIso8601String()])],
            default => null,
        };
    }
}
