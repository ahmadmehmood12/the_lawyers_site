<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\CaseStatus;
use App\Enums\HearingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PlanFeature;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Models\CaseExpense;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LegalCase;
use App\Models\Payment;
use App\Models\Task;
use App\Services\Access\OrganizationAccess;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Private practice analytics. Outcomes are deliberately not presented as a
 * measure of lawyer competence (docs/Modules/Analytics.md).
 */
class AnalyticsController extends Controller
{
    public function __invoke(Request $request, OrganizationAccess $access, SubscriptionService $subscriptions): Response
    {
        $organization = $this->organization();
        abort_unless($access->allows($request->user(), $organization, 'analytics.view'), 403);
        $months = collect(range(11, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i));
        $from = $months->first()->copy();
        $label = fn (Carbon $m) => $m->translatedFormat('M y');
        $series = function ($rows) use ($months, $label) {
            $map = collect($rows)->pluck('value', 'ym');

            return $months->map(fn ($m) => ['label' => $label($m), 'value' => (float) ($map[$m->format('Y-m')] ?? 0)])->values();
        };
        $finance = $access->allows($request->user(), $organization, 'finance.view');

        return Inertia::render('Workspace/Analytics', [
            'planAllows' => $planAllows = $subscriptions->enabled($organization, PlanFeature::Analytics),
            'upgrade' => $planAllows ? null : $subscriptions->upgradeOffer($organization, PlanFeature::Analytics, 0),
            'totals' => [
                'active' => LegalCase::query()->forOrganization($organization)->whereIn('status', CaseStatus::openValues())->count(),
                'closed' => LegalCase::query()->forOrganization($organization)->whereNotIn('status', CaseStatus::openValues())->count(),
                'upcoming' => Hearing::query()->forOrganization($organization)->where('status', HearingStatus::Scheduled->value)->whereDate('hearing_date', '>=', today())->count(),
                'openTasks' => Task::query()->forOrganization($organization)->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value])->count(),
                'overdueTasks' => Task::query()->forOrganization($organization)->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value])->whereDate('due_date', '<', today())->count(),
            ],
            'registrations' => $series(LegalCase::query()->forOrganization($organization)->where('created_at', '>=', $from)->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as value")->groupBy('ym')->get()),
            'hearingsHeld' => $series(Hearing::query()->forOrganization($organization)->whereIn('status', [HearingStatus::Held->value, HearingStatus::Adjourned->value])->where('hearing_date', '>=', $from)->selectRaw("DATE_FORMAT(hearing_date, '%Y-%m') as ym, COUNT(*) as value")->groupBy('ym')->get()),
            'byCourt' => LegalCase::query()->forOrganization($organization)->whereIn('legal_cases.status', CaseStatus::openValues())->leftJoin('courts', 'courts.id', '=', 'legal_cases.court_id')
                ->selectRaw('COALESCE(courts.name, ?) as label, COUNT(*) as value', [__('No court set')])->groupBy('label')->orderByDesc('value')->limit(10)->get()->map(fn ($r) => ['label' => $r->label, 'value' => (int) $r->value]),
            'byStatus' => LegalCase::query()->forOrganization($organization)->selectRaw('status, COUNT(*) as value')->groupBy('status')->get()
                ->map(fn ($r) => ['label' => CaseStatus::from($r->status->value ?? $r->status)->label(), 'value' => (int) $r->value]),
            'workload' => DB::table('case_lawyer')->join('legal_cases', 'legal_cases.id', '=', 'case_lawyer.legal_case_id')->join('users', 'users.id', '=', 'case_lawyer.user_id')
                ->where('legal_cases.organization_id', $organization->id)->whereNull('legal_cases.deleted_at')->whereIn('legal_cases.status', CaseStatus::openValues())
                ->selectRaw('users.name as label, COUNT(*) as value')->groupBy('users.id', 'users.name')->orderByDesc('value')->limit(15)->get()->map(fn ($r) => ['label' => $r->label, 'value' => (int) $r->value]),
            'finance' => $finance ? [
                'revenue' => $series(Payment::query()->forOrganization($organization)->where('status', 'confirmed')->where('paid_on', '>=', $from)->selectRaw("DATE_FORMAT(paid_on, '%Y-%m') as ym, SUM(amount) as value")->groupBy('ym')->get()),
                'expenses' => $series(CaseExpense::query()->forOrganization($organization)->where('incurred_on', '>=', $from)->selectRaw("DATE_FORMAT(incurred_on, '%Y-%m') as ym, SUM(amount) as value")->groupBy('ym')->get()),
                'outstanding' => (float) Invoice::query()->forOrganization($organization)->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->sum(DB::raw('total - amount_paid')),
                'outstandingCount' => Invoice::query()->forOrganization($organization)->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])->count(),
            ] : null,
        ]);
    }
}
