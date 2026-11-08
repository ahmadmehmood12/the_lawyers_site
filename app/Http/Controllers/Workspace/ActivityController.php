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
        $activities = ActivityPresenter::eagerLoad($this->visible($request->user(), $organization))
            ->latest('id')->paginate(30)->withQueryString()
            ->through(fn (Activity $a) => ActivityPresenter::present($a));

        return Inertia::render('Workspace/Activity', [
            'activities' => $activities,
            'scope' => $this->viewsAll($request->user(), $organization) ? 'firm' : 'mine',
        ]);
    }

    /** Latest entries for the header bell. */
    public function recent(Request $request): JsonResponse
    {
        $items = ActivityPresenter::eagerLoad($this->visible($request->user(), $this->organization()))
            ->latest('id')->limit(12)->get()
            ->map(fn (Activity $a) => ActivityPresenter::present($a));

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
