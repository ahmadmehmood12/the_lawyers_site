<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AppointmentStatus;
use App\Enums\CaseStatus;
use App\Enums\HearingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\Message;
use App\Models\Payment;
use App\Models\Task;
use App\Services\Access\OrganizationAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Lawyer/firm dashboard. Every number is computed from the database and
 * respects the viewer's case visibility. Heavier blocks are deferred props.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        $can = fn (string $p) => $access->allows($user, $organization, $p);
        $cases = fn () => LegalCase::query()->visibleTo($user, $organization);
        $seeAllHearings = $can('diary.view_all') || $can('cases.view_all');
        $hearings = fn () => Hearing::query()->forOrganization($organization)
            ->when(! $seeAllHearings, fn ($q) => $q->where(fn ($w) => $w->where('assigned_lawyer_id', $user->id)->orWhereHas('legalCase.lawyers', fn ($l) => $l->whereKey($user->id))));

        $today = $hearings()->where('status', HearingStatus::Scheduled->value)->whereDate('hearing_date', today())
            ->with(['legalCase:id,title,reference,case_number', 'court:id,name', 'assignedLawyer:id,name'])
            ->orderByRaw('hearing_time IS NULL, hearing_time')->get();

        $lawyerProfile = $user->lawyerProfile;

        return Inertia::render('Workspace/Dashboard', [
            'stats' => [
                'totalCases' => $cases()->count(),
                'activeCases' => $cases()->whereIn('status', CaseStatus::openValues())->count(),
                'todayHearings' => $today->count(),
                'upcomingHearings' => $hearings()->where('status', HearingStatus::Scheduled->value)->whereBetween('hearing_date', [today()->addDay(), today()->addDays(7)])->count(),
                'pendingTasks' => Task::query()->forOrganization($organization)->where('assigned_to', $user->id)->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value])->count(),
                'clients' => $can('clients.view') ? $organization->clients()->count() : null,
                'consultationRequests' => $can('appointments.manage') || $user->isLawyer()
                    ? Appointment::query()->forOrganization($organization)->where('status', AppointmentStatus::Requested->value)
                        ->when(! $can('appointments.manage'), fn ($q) => $q->where('lawyer_id', $user->id))->count()
                    : null,
                'unreadMessages' => Message::query()
                    ->join('conversation_participants as cp', fn ($j) => $j->on('cp.conversation_id', '=', 'messages.conversation_id')->where('cp.user_id', $user->id))
                    ->where('messages.sender_id', '!=', $user->id)
                    ->where(fn ($q) => $q->whereNull('cp.last_read_at')->orWhereColumn('messages.created_at', '>', 'cp.last_read_at'))
                    ->count(),
                'outstanding' => $can('finance.view') ? (float) Invoice::query()->forOrganization($organization)->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->sum(DB::raw('total - amount_paid')) : null,
                'monthRevenue' => $can('finance.view') ? (float) Payment::query()->forOrganization($organization)->where('status', 'confirmed')->whereBetween('paid_on', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount') : null,
            ],
            'index' => Inertia::defer(fn () => [
                'documents' => $can('documents.view') ? $organization->documents()->count() : null,
                'draftsInReview' => $can('drafts.manage') ? $organization->drafts()->where('status', 'in_review')->count() : null,
                'appointmentsUpcoming' => Appointment::query()->forOrganization($organization)->whereIn('status', [AppointmentStatus::Requested->value, AppointmentStatus::Confirmed->value])->where('starts_at', '>=', now())
                    ->when(! $can('appointments.manage'), fn ($q) => $q->where('lawyer_id', $user->id))->count(),
                'invoicesOverdue' => $can('finance.view') ? Invoice::query()->forOrganization($organization)->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->whereDate('due_date', '<', today())->count() : null,
                'ordersThisMonth' => $hearings()->whereNotNull('order_passed')->where('held_on', '>=', now()->startOfMonth())->count(),
            ], 'index'),
            'todayHearings' => $today->map(fn (Hearing $h) => [
                ...CaseController::hearingSummary($h),
                'case' => ['id' => $h->legalCase->id, 'title' => $h->legalCase->title, 'reference' => $h->legalCase->reference, 'case_number' => $h->legalCase->case_number],
            ]),
            'upcoming' => Inertia::defer(fn () => $hearings()->where('status', HearingStatus::Scheduled->value)->whereBetween('hearing_date', [today()->addDay(), today()->addDays(14)])
                ->with(['legalCase:id,title,reference', 'court:id,name'])->orderBy('hearing_date')->orderBy('hearing_time')->limit(8)->get()
                ->map(fn (Hearing $h) => [...CaseController::hearingSummary($h), 'case' => ['id' => $h->legalCase->id, 'title' => $h->legalCase->title, 'reference' => $h->legalCase->reference]])),
            'tasks' => Inertia::defer(fn () => Task::query()->forOrganization($organization)->where('assigned_to', $user->id)
                ->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value])->with('legalCase:id,title,reference')
                ->orderByRaw('due_date IS NULL, due_date')->limit(6)->get()->map(fn ($t) => TaskController::present($t))),
            'breakdown' => Inertia::defer(fn () => [
                'bySpecialization' => $cases()->whereIn('legal_cases.status', CaseStatus::openValues())->leftJoin('specializations as s', 's.id', '=', 'legal_cases.specialization_id')
                    ->selectRaw('COALESCE(s.name, ?) as label, COUNT(*) as value', [__('Unspecified')])->groupBy('label')->orderByDesc('value')->limit(6)->get()
                    ->map(fn ($r) => ['label' => $r->label, 'value' => (int) $r->value]),
                'byCourt' => $cases()->whereIn('legal_cases.status', CaseStatus::openValues())->leftJoin('courts as c', 'c.id', '=', 'legal_cases.court_id')
                    ->selectRaw('COALESCE(c.name, ?) as label, COUNT(*) as value', [__('No court set')])->groupBy('label')->orderByDesc('value')->limit(6)->get()
                    ->map(fn ($r) => ['label' => $r->label, 'value' => (int) $r->value]),
            ]),
            'activity' => Inertia::defer(fn () => Activity::query()
                ->whereIn('log_name', ['cases', 'hearings'])
                ->where(fn ($q) => $q->where(fn ($w) => $w->where('subject_type', (new LegalCase)->getMorphClass())->whereIn('subject_id', $cases()->select('legal_cases.id')))
                    ->orWhere(fn ($w) => $w->where('subject_type', (new Hearing)->getMorphClass())->whereIn('subject_id', $hearings()->select('hearings.id'))))
                ->with('causer:id,name')->latest('id')->limit(8)->get()
                ->map(fn ($a) => ['id' => $a->id, 'description' => $a->description, 'log' => $a->log_name, 'subject_id' => $a->subject_id, 'subject_type' => class_basename($a->subject_type), 'causer' => $a->causer?->name, 'created_at' => $a->created_at->toIso8601String()])),
            'profile' => $lawyerProfile ? [
                'verification_status' => $lawyerProfile->verification_status->value,
                'verification_label' => $lawyerProfile->verification_status->label(),
                'is_public' => $lawyerProfile->is_public,
                'onboarding_complete' => $lawyerProfile->onboarding_completed_at !== null,
            ] : null,
            'can' => [
                'createCase' => $can('cases.create'),
                'createClient' => $can('clients.create'),
                'invoice' => $can('finance.invoice'),
                'upload' => $can('documents.upload'),
                'draft' => $can('drafts.manage'),
            ],
        ]);
    }
}
