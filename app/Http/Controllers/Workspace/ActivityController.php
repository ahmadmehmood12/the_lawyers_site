<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Support\ActivityPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * What the firm's members did, as sentences (docs/Modules/Activity-Feed.md).
 * Owners and senior advocates (activity.view_all) see the whole firm; everyone else
 * sees their own actions and activity on cases they can open.
 */
class ActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        $filters = $request->validate([
            'member' => ['nullable', 'integer'],
            'log' => ['nullable', 'string', 'max:40'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $base = $this->visible($user, $organization);

        $activities = ActivityPresenter::eagerLoad((clone $base)
            ->when($filters['member'] ?? null, fn (Builder $q, $id) => $q->where('causer_type', $user->getMorphClass())->where('causer_id', $id))
            ->when($filters['log'] ?? null, fn (Builder $q, $log) => $q->where('log_name', $log))
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->when($filters['search'] ?? null, fn (Builder $q, $s) => $q->where(fn (Builder $w) => $w
                ->orWhereHasMorph('subject', [LegalCase::class], fn (Builder $c) => $c->where('title', 'like', "%{$s}%")->orWhere('reference', 'like', "%{$s}%")))))
            ->latest()->latest('id')->paginate(40)->withQueryString()
            ->through(fn (Activity $a) => ActivityPresenter::present($a, 'organization', false));

        $weekStart = now()->subDays(7);

        return Inertia::render('Workspace/Activity', [
            'activities' => $activities,
            'scope' => $this->viewsAll($user, $organization) ? 'firm' : 'mine',
            'filters' => $filters,
            'members' => $organization->members()->with('user:id,name')->get()->map(fn ($m) => ['value' => (string) $m->user_id, 'label' => $m->user?->name])->filter(fn ($o) => $o['label'])->values(),
            'logs' => (clone $base)->distinct()->orderBy('log_name')->pluck('log_name')->filter()->values(),
            'summary' => [
                'week' => (clone $base)->where('created_at', '>=', $weekStart)->count(),
                'members' => (clone $base)->where('created_at', '>=', $weekStart)->distinct()->count('causer_id'),
                'sign_ins' => (clone $base)->where('log_name', 'auth')->where('description', 'login')->whereDate('created_at', today())->count(),
            ],
        ]);
    }

    /** Latest entries for the header bell. */
    public function recent(Request $request): JsonResponse
    {
        $organization = $this->organization();
        $items = ActivityPresenter::eagerLoad($this->visible($request->user(), $organization))
            ->latest()->latest('id')->limit(12)->get()
            ->map(fn (Activity $a) => ActivityPresenter::present($a, 'organization', false));

        return response()->json(['items' => $items]);
    }

    private function viewsAll(User $user, Organization $organization): bool
    {
        return app(OrganizationAccess::class)->allows($user, $organization, 'activity.view_all');
    }

    private function visible(User $user, Organization $organization): Builder
    {
        $query = Activity::query()->where('organization_id', $organization->id);

        if ($this->viewsAll($user, $organization)) {
            return $query;
        }

        $cases = LegalCase::query()->visibleTo($user, $organization)->select('legal_cases.id');

        return $query->where(fn (Builder $q) => $q
            ->where(fn (Builder $w) => $w->where('causer_type', $user->getMorphClass())->where('causer_id', $user->id))
            ->orWhere(fn (Builder $w) => $w->where('subject_type', (new LegalCase)->getMorphClass())->whereIn('subject_id', $cases))
            ->orWhere(fn (Builder $w) => $w->where('subject_type', (new Hearing)->getMorphClass())
                ->whereIn('subject_id', Hearing::query()->whereIn('legal_case_id', LegalCase::query()->visibleTo($user, $organization)->select('legal_cases.id'))->select('hearings.id'))));
    }
}
