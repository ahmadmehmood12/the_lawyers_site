<?php

namespace App\Services\Directory;

use App\Enums\CaseStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Admin\ShowcaseController;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Draft;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\TeamDesignation;
use App\Models\TeamMember;
use App\Models\Testimonial;
use App\Support\DirectoryPresenter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Public homepage numbers and the top-rated lawyers section (docs/Features/Home-Page.md).
 * Everything comes from the database and is cached briefly; nothing is invented.
 */
class HomepageShowcase
{
    /** Approved reviews a lawyer needs before being ranked as "top rated". */
    public const MIN_REVIEWS = 3;

    /** Weight of the platform average in the Bayesian score (pulls few-review ratings toward the mean). */
    private const PRIOR_WEIGHT = 5;

    /**
     * Platform totals: listed lawyers, client records, drafts and cases. Aggregates only.
     *
     * @return array{lawyers: int, firms: int, clients: int, cases: int, consultations: int, drafts: int}
     */
    public function stats(): array
    {
        return Cache::remember('home-showcase-stats-v2', now()->addMinutes(15), fn () => [
            'lawyers' => LawyerProfile::query()->listed()->count(),
            'firms' => Organization::query()->where('type', 'firm')->where('is_public', true)->count(),
            'consultations' => Appointment::query()->whereIn('status', ['confirmed', 'completed'])->count(),
            'clients' => Client::query()->count(),
            'drafts' => Draft::query()->count(),
            'cases' => LegalCase::query()->count(),
        ]);
    }

    /**
     * Admin-managed showcase: active testimonials, video testimonials and team members grouped
     * by designation. Cached; ShowcaseController clears the cache on every change.
     *
     * @return array{testimonials: list<array<string, mixed>>, videos: list<array<string, mixed>>, team: list<array{designation: string, members: list<array<string, mixed>>}>}
     */
    public function content(): array
    {
        $urdu = app()->getLocale() === 'ur';

        return Cache::remember(ShowcaseController::CACHE_KEY.'-'.app()->getLocale(), now()->addMinutes(30), fn () => [
            'testimonials' => Testimonial::query()->published('text')->limit(12)->get()->map->toPublicArray()->all(),
            'videos' => Testimonial::query()->published('video')->whereNotNull('video_path')->limit(6)->get()->map->toPublicArray()->all(),
            'team' => TeamDesignation::query()->orderBy('sort_order')->orderBy('name')
                ->with(['members' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('name')])->get()
                ->filter(fn (TeamDesignation $d) => $d->members->isNotEmpty())
                ->map(fn (TeamDesignation $d) => [
                    'designation' => $urdu && $d->name_ur ? $d->name_ur : $d->name,
                    'members' => $d->members->map(fn (TeamMember $m) => $m->setRelation('designation', $d)->toPublicArray($urdu))->all(),
                ])->values()->all(),
        ]);
    }

    /**
     * Up to four lawyers. "rated" when enough lawyers have MIN_REVIEWS approved reviews, ranked by
     * a Bayesian average (R*v + C*m) / (v + m) with completed cases as tie-break. Otherwise
     * "verified": verified lawyers by reviews, completed cases and experience, with no rating claim.
     *
     * @return array{mode: string, lawyers: list<array<string, mixed>>}
     */
    public function topLawyers(int $limit = 4): array
    {
        return Cache::remember('home-showcase-lawyers-'.app()->getLocale(), now()->addMinutes(15), function () use ($limit) {
            $closed = array_map(fn (CaseStatus $s) => $s->value, array_filter(CaseStatus::cases(), fn (CaseStatus $s) => $s->isClosed()));
            $mean = (float) (LawyerProfile::query()->listed()->where('rating_count', '>', 0)->avg('rating_average') ?: 4.0);

            $base = fn () => LawyerProfile::query()->select('lawyer_profiles.*')->listed()
                ->where('verification_status', VerificationStatus::Approved->value)
                ->with([
                    'user:id,name,avatar_path',
                    'user.memberships' => fn ($q) => $q->where('status', 'active')->whereHas('organization', fn ($o) => $o->where('type', 'firm')->where('is_public', true)),
                    'user.memberships.organization:id,name,slug',
                    'city:id,name,name_ur', 'specializations:id,name,name_ur,slug', 'barCouncil:id,name,code', 'educations', 'courts:id,name,name_ur', 'languages',
                ])
                ->addSelect([
                    'cases_handled' => DB::table('case_lawyer')->selectRaw('COUNT(DISTINCT case_lawyer.legal_case_id)')->whereColumn('case_lawyer.user_id', 'lawyer_profiles.user_id'),
                    'cases_completed' => DB::table('case_lawyer')->join('legal_cases', 'legal_cases.id', '=', 'case_lawyer.legal_case_id')
                        ->selectRaw('COUNT(DISTINCT legal_cases.id)')->whereColumn('case_lawyer.user_id', 'lawyer_profiles.user_id')->whereIn('legal_cases.status', $closed),
                ]);

            $rated = $base()->where('rating_count', '>=', self::MIN_REVIEWS)
                ->selectRaw('((rating_average * rating_count) + ? * ?) / (rating_count + ?) as score', [$mean, self::PRIOR_WEIGHT, self::PRIOR_WEIGHT])
                ->orderByDesc('score')->orderByDesc('cases_completed')->orderByDesc('rating_count')
                ->limit($limit)->get();

            $mode = $rated->count() >= 2 ? 'rated' : 'verified';
            $profiles = $mode === 'rated' ? $rated : $base()
                ->orderByDesc('rating_count')->orderByDesc('cases_completed')->orderBy('practice_since')
                ->limit($limit)->get();

            return [
                'mode' => $mode,
                'lawyers' => $profiles->map(fn (LawyerProfile $p) => [
                    ...DirectoryPresenter::lawyer($p),
                    'cases_handled' => (int) $p->cases_handled,
                    'cases_completed' => (int) $p->cases_completed,
                ])->values()->all(),
            ];
        });
    }
}
