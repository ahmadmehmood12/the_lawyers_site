<?php

namespace App\Services\Analytics\Sections;

use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Enums\HearingStatus;
use App\Enums\TaskStatus;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use App\Support\PublicFile;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Cases, hearings, clients, lawyers and firms across all chambers: counts and rankings only.
 * Pending = draft or filed (not yet before the court), Closed = decided, withdrawn, dismissed,
 * disposed or archived, Active = every other open status.
 */
class PracticeAnalytics extends AnalyticsSection
{
    private const PENDING = ['draft', 'filed'];

    public function data(): array
    {
        return [
            'kpis' => $this->kpis(),
            'case_groups' => $this->caseGroups(),
            'case_statuses' => $this->enumCounts($this->cases(), 'status', CaseStatus::class),
            'case_trend' => $this->combine([
                'opened' => $this->series($this->cases(), 'created_at'),
                'decided' => $this->series($this->cases()->whereNotNull('decided_on'), 'decided_on', dateColumn: true),
            ], ['opened' => __('Cases opened'), 'decided' => __('Cases decided')]),
            'case_types' => $this->grouped($this->cases(), 'case_type', CaseType::class),
            'case_courts' => $this->courtCounts($this->cases(), 'legal_cases.court_id'),
            'case_areas' => $this->areaCounts(),
            'hearing_statuses' => $this->enumCounts($this->range->applyDate($this->hearings(), 'hearing_date'), 'status', HearingStatus::class),
            'hearing_trend' => $this->series($this->hearings(), 'hearing_date', dateColumn: true),
            'hearing_courts' => $this->courtCounts($this->range->applyDate($this->hearings(), 'hearing_date'), 'hearings.court_id'),
            'tasks' => $this->enumCounts($this->range->apply(DB::table('tasks'), 'created_at'), 'status', TaskStatus::class),
            'lawyers' => $this->lawyers(),
            'firms' => $this->firms(),
            'clients' => $this->clients(),
        ];
    }

    private function cases(): Builder
    {
        return DB::table('legal_cases')->whereNull('legal_cases.deleted_at');
    }

    private function hearings(): Builder
    {
        return DB::table('hearings');
    }

    /** @return array<string, mixed> */
    private function kpis(): array
    {
        $open = CaseStatus::openValues();
        $active = array_values(array_diff($open, self::PENDING));
        $today = now()->toDateString();
        $hearingsBy = fn (string $status) => fn (AnalyticsRange $r) => (int) $r->applyDate($this->hearings()->where('status', $status), 'hearing_date')->count();

        return [
            'cases_total' => (int) $this->cases()->count(),
            'cases_active' => (int) $this->cases()->whereIn('status', $active)->count(),
            'cases_pending' => (int) $this->cases()->whereIn('status', self::PENDING)->count(),
            'cases_closed' => (int) $this->cases()->whereNotIn('status', $open)->count(),
            'cases_new' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply($this->cases(), 'created_at')->count()),
            'cases_decided' => $this->compare(fn (AnalyticsRange $r) => (int) $r->applyDate($this->cases(), 'decided_on')->count()),
            'hearings' => $this->compare(fn (AnalyticsRange $r) => (int) $r->applyDate($this->hearings(), 'hearing_date')->count()),
            'hearings_held' => $this->compare($hearingsBy('held')),
            'hearings_adjourned' => $this->compare($hearingsBy('adjourned')),
            'upcoming_7' => (int) $this->hearings()->where('status', 'scheduled')->whereBetween('hearing_date', [$today, now()->addDays(7)->toDateString()])->count(),
            'upcoming_30' => (int) $this->hearings()->where('status', 'scheduled')->whereBetween('hearing_date', [$today, now()->addDays(30)->toDateString()])->count(),
            'overdue_outcomes' => (int) $this->hearings()->where('status', 'scheduled')->where('hearing_date', '<', $today)->count(),
            'clients_total' => (int) DB::table('clients')->whereNull('deleted_at')->count(),
            'clients_new' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('clients')->whereNull('deleted_at'), 'created_at')->count()),
            'clients_portal' => (int) DB::table('clients')->whereNull('deleted_at')->whereNotNull('user_id')->count(),
        ];
    }

    private function caseGroups(): array
    {
        $open = CaseStatus::openValues();

        return [
            ['key' => 'active', 'label' => __('Active'), 'value' => (int) $this->cases()->whereIn('status', array_diff($open, self::PENDING))->count()],
            ['key' => 'pending', 'label' => __('Pending'), 'value' => (int) $this->cases()->whereIn('status', self::PENDING)->count()],
            ['key' => 'closed', 'label' => __('Closed'), 'value' => (int) $this->cases()->whereNotIn('status', $open)->count()],
        ];
    }

    private function courtCounts(Builder $query, string $column): array
    {
        return (clone $query)->join('courts', 'courts.id', '=', $column)
            ->selectRaw('courts.id, courts.name, courts.name_ur, COUNT(*) as aggregate')
            ->groupBy('courts.id', 'courts.name', 'courts.name_ur')->orderByDesc('aggregate')->limit(10)->get()
            ->map(fn ($row) => ['key' => (string) $row->id, 'label' => app()->getLocale() === 'ur' && $row->name_ur ? $row->name_ur : $row->name, 'value' => (int) $row->aggregate])->all();
    }

    private function areaCounts(): array
    {
        return $this->cases()->join('specializations', 'specializations.id', '=', 'legal_cases.specialization_id')
            ->selectRaw('specializations.id, specializations.name, specializations.name_ur, COUNT(*) as aggregate')
            ->groupBy('specializations.id', 'specializations.name', 'specializations.name_ur')->orderByDesc('aggregate')->limit(10)->get()
            ->map(fn ($row) => ['key' => (string) $row->id, 'label' => app()->getLocale() === 'ur' && $row->name_ur ? $row->name_ur : $row->name, 'value' => (int) $row->aggregate])->all();
    }

    /** Lawyers with the most cases (assigned through case_lawyer), with workload in the range. */
    private function lawyers(): array
    {
        $open = CaseStatus::openValues();
        $openList = "'".implode("','", $open)."'";
        [$from, $to] = [$this->range->from->toDateTimeString(), $this->range->to->toDateTimeString()];

        $rows = DB::table('case_lawyer')
            ->join('legal_cases', fn ($j) => $j->on('legal_cases.id', '=', 'case_lawyer.legal_case_id')->whereNull('legal_cases.deleted_at'))
            ->join('users', 'users.id', '=', 'case_lawyer.user_id')
            ->leftJoin('lawyer_profiles', 'lawyer_profiles.user_id', '=', 'users.id')
            ->leftJoin('organizations', 'organizations.id', '=', 'users.current_organization_id')
            ->selectRaw("users.id, users.name, users.avatar_path, lawyer_profiles.slug, lawyer_profiles.rating_average, lawyer_profiles.rating_count,
                lawyer_profiles.verification_status, organizations.name as organization,
                COUNT(DISTINCT legal_cases.id) as cases,
                COUNT(DISTINCT CASE WHEN legal_cases.status IN ({$openList}) THEN legal_cases.id END) as active,
                COUNT(DISTINCT CASE WHEN legal_cases.status NOT IN ({$openList}) THEN legal_cases.id END) as closed,
                COUNT(DISTINCT CASE WHEN legal_cases.created_at BETWEEN ? AND ? THEN legal_cases.id END) as new_cases", [$from, $to])
            ->groupBy('users.id', 'users.name', 'users.avatar_path', 'lawyer_profiles.slug', 'lawyer_profiles.rating_average', 'lawyer_profiles.rating_count', 'lawyer_profiles.verification_status', 'organizations.name')
            ->orderByDesc('cases')->limit(50)->get();

        $ids = $rows->pluck('id');
        $hearings = $this->range->applyDate(DB::table('hearings')->whereIn('assigned_lawyer_id', $ids), 'hearing_date')
            ->selectRaw("assigned_lawyer_id, COUNT(*) as total, SUM(status = 'held') as held")->groupBy('assigned_lawyer_id')->get()->keyBy('assigned_lawyer_id');
        $appointments = $this->range->apply(DB::table('appointments')->whereIn('lawyer_id', $ids), 'created_at')
            ->selectRaw("lawyer_id, COUNT(*) as total, SUM(status = 'completed') as completed")->groupBy('lawyer_id')->get()->keyBy('lawyer_id');

        return $rows->map(fn ($row) => [
            'id' => $row->id,
            'name' => $row->name,
            'avatar' => PublicFile::url($row->avatar_path),
            'organization' => $row->organization,
            'profile_url' => $row->slug && $row->verification_status === 'approved' ? route('lawyers.show', $row->slug) : null,
            'cases' => (int) $row->cases,
            'active' => (int) $row->active,
            'closed' => (int) $row->closed,
            'new_cases' => (int) $row->new_cases,
            'hearings' => (int) ($hearings[$row->id]->total ?? 0),
            'hearings_held' => (int) ($hearings[$row->id]->held ?? 0),
            'appointments' => (int) ($appointments[$row->id]->total ?? 0),
            'appointments_completed' => (int) ($appointments[$row->id]->completed ?? 0),
            'rating' => $row->rating_count ? round((float) $row->rating_average, 1) : null,
            'reviews' => (int) $row->rating_count,
        ])->all();
    }

    /** Law firms and solo chambers compared: size, caseload, activity and fees in the range. */
    private function firms(): array
    {
        $openList = "'".implode("','", CaseStatus::openValues())."'";
        [$from, $to] = [$this->range->from->toDateTimeString(), $this->range->to->toDateTimeString()];
        [$fromDate, $toDate] = [$this->range->from->toDateString(), $this->range->to->toDateString()];

        return DB::table('organizations as o')->whereNull('o.deleted_at')
            ->selectRaw("o.id, o.name, o.type, o.status,
                (SELECT COUNT(*) FROM legal_cases c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) as cases,
                (SELECT COUNT(*) FROM legal_cases c WHERE c.organization_id = o.id AND c.deleted_at IS NULL AND c.status IN ({$openList})) as active_cases,
                (SELECT COUNT(*) FROM clients cl WHERE cl.organization_id = o.id AND cl.deleted_at IS NULL) as clients,
                (SELECT COUNT(*) FROM organization_members m WHERE m.organization_id = o.id AND m.status = 'active') as members,
                (SELECT COUNT(*) FROM hearings h WHERE h.organization_id = o.id AND h.hearing_date BETWEEN ? AND ?) as hearings,
                (SELECT COUNT(*) FROM appointments a WHERE a.organization_id = o.id AND a.created_at BETWEEN ? AND ?) as appointments,
                (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.organization_id = o.id AND p.status = 'confirmed' AND p.paid_on BETWEEN ? AND ?) as collected,
                (SELECT pl.name FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id WHERE s.organization_id = o.id AND s.status IN ('active', 'trialing') ORDER BY s.starts_at DESC LIMIT 1) as plan",
                [$fromDate, $toDate, $from, $to, $fromDate, $toDate])
            ->orderByDesc('cases')->orderByDesc('clients')->limit(50)->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'type' => $row->type,
                'type_label' => $row->type === 'firm' ? __('Law firm') : __('Solo chamber'),
                'status' => $row->status,
                'plan' => $row->plan,
                'cases' => (int) $row->cases,
                'active_cases' => (int) $row->active_cases,
                'clients' => (int) $row->clients,
                'members' => (int) $row->members,
                'hearings' => (int) $row->hearings,
                'appointments' => (int) $row->appointments,
                'collected' => (float) $row->collected,
            ])->all();
    }

    /** Client records (aggregate) and the most active client accounts (portal users). */
    private function clients(): array
    {
        $top = DB::table('users')->where('users.account_type', 'client')
            ->join('clients', fn ($j) => $j->on('clients.user_id', '=', 'users.id')->whereNull('clients.deleted_at'))
            ->leftJoin('case_client', 'case_client.client_id', '=', 'clients.id')
            ->leftJoin('appointments', 'appointments.client_id', '=', 'clients.id')
            ->selectRaw('users.id, users.name, users.avatar_path, COUNT(DISTINCT case_client.legal_case_id) as cases, COUNT(DISTINCT appointments.id) as appointments, COUNT(DISTINCT clients.organization_id) as chambers')
            ->groupBy('users.id', 'users.name', 'users.avatar_path')
            ->orderByRaw('COUNT(DISTINCT case_client.legal_case_id) + COUNT(DISTINCT appointments.id) DESC')->limit(10)->get()
            ->map(fn ($row) => [
                'id' => $row->id, 'name' => $row->name, 'avatar' => PublicFile::url($row->avatar_path),
                'cases' => (int) $row->cases, 'appointments' => (int) $row->appointments, 'chambers' => (int) $row->chambers,
            ])->all();

        return [
            'types' => $this->grouped(DB::table('clients')->whereNull('deleted_at'), 'type'),
            'trend' => $this->series(DB::table('clients')->whereNull('deleted_at'), 'created_at'),
            'top' => $top,
        ];
    }
}
