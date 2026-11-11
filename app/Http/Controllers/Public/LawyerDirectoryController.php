<?php

namespace App\Http\Controllers\Public;

use App\Enums\AdvocateCategory;
use App\Enums\CaseStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\OrganizationMember;
use App\Support\DirectoryPresenter;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public lawyer directory and profiles (docs/Modules/Lawyers.md).
 * Only profiles the lawyer has published appear. Every field is labelled as
 * verified (checked by a verification officer), reported (self-declared) or
 * platform (computed from platform records).
 */
class LawyerDirectoryController extends Controller
{
    public const LANGUAGES = ['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki', 'Hindko', 'Arabic'];

    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'city', 'province', 'district', 'court', 'specialization', 'experience', 'bar_council', 'category', 'language', 'online', 'fee_max', 'verified', 'sort']);

        $closed = array_map(fn (CaseStatus $s) => $s->value, array_filter(CaseStatus::cases(), fn (CaseStatus $s) => $s->isClosed()));

        $lawyers = LawyerProfile::query()->select('lawyer_profiles.*')->listed()
            ->addSelect([
                'cases_handled' => DB::table('case_lawyer')->selectRaw('COUNT(DISTINCT case_lawyer.legal_case_id)')->whereColumn('case_lawyer.user_id', 'lawyer_profiles.user_id'),
                'cases_completed' => DB::table('case_lawyer')->join('legal_cases', 'legal_cases.id', '=', 'case_lawyer.legal_case_id')
                    ->selectRaw('COUNT(DISTINCT legal_cases.id)')->whereColumn('case_lawyer.user_id', 'lawyer_profiles.user_id')->whereIn('legal_cases.status', $closed),
            ])
            ->with([
                'user:id,name,avatar_path',
                'user.memberships' => fn ($q) => $q->where('status', 'active')
                    ->whereHas('organization', fn ($o) => $o->where('type', 'firm')->where('is_public', true)),
                'user.memberships.organization:id,name,slug',
                'city:id,name,name_ur', 'specializations:id,name,name_ur,slug', 'barCouncil:id,name,code',
                'educations', 'courts:id,name,name_ur', 'languages',
            ])
            ->when($filters['search'] ?? null, fn (Builder $q, $s) => $q->where(fn ($w) => $w->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))->orWhere('headline', 'like', "%{$s}%")))
            ->when($filters['city'] ?? null, fn (Builder $q, $slug) => $q->whereHas('city', fn ($c) => $c->where('slug', $slug)))
            ->when($filters['province'] ?? null, fn (Builder $q, $id) => $q->where('province_id', (int) $id))
            ->when($filters['district'] ?? null, fn (Builder $q, $id) => $q->where('district_id', (int) $id))
            ->when($filters['court'] ?? null, fn (Builder $q, $id) => $q->whereHas('courts', fn ($c) => $c->whereKey((int) $id)))
            ->when($filters['specialization'] ?? null, fn (Builder $q, $slug) => $q->whereHas('specializations', fn ($s) => $s->where('slug', $slug)))
            ->when($filters['experience'] ?? null, fn (Builder $q, $years) => $q->where('practice_since', '<=', now()->year - (int) $years))
            ->when($filters['bar_council'] ?? null, fn (Builder $q, $id) => $q->where('bar_council_id', (int) $id))
            ->when($filters['category'] ?? null, fn (Builder $q, $c) => $q->where('advocate_category', $c))
            ->when($filters['language'] ?? null, fn (Builder $q, $l) => $q->whereHas('languages', fn ($w) => $w->where('language', $l)))
            ->when(($filters['online'] ?? null) === '1', fn (Builder $q) => $q->where('offers_online', true))
            ->when($filters['fee_max'] ?? null, fn (Builder $q, $fee) => $q->where(fn ($w) => $w->whereNull('consultation_fee_min')->orWhere('consultation_fee_min', '<=', (int) $fee)))
            ->when(($filters['verified'] ?? null) === '1', fn (Builder $q) => $q->where('verification_status', VerificationStatus::Approved->value))
            ->when(($filters['sort'] ?? null) === 'experience', fn (Builder $q) => $q->orderByRaw('practice_since IS NULL, practice_since'))
            ->when(($filters['sort'] ?? null) === 'rating', fn (Builder $q) => $q->orderByDesc('rating_average'))
            ->orderByRaw("verification_status = 'approved' DESC")->orderByDesc('rating_count')->orderBy('id')
            ->paginate(12)->withQueryString()
            ->through(fn (LawyerProfile $p) => [
                ...DirectoryPresenter::lawyer($p),
                'cases_handled' => (int) $p->cases_handled,
                'cases_completed' => (int) $p->cases_completed,
            ]);

        return Inertia::render('Public/Lawyers/Index', [
            'lawyers' => $lawyers,
            'filters' => $filters,
            'options' => [
                'cities' => ReferenceOptions::cities(),
                'provinces' => ReferenceOptions::provinces(),
                'districts' => ReferenceOptions::districts(),
                'courts' => ReferenceOptions::courts(),
                'specializations' => ReferenceOptions::specializations(),
                'barCouncils' => ReferenceOptions::barCouncils(),
                'categories' => AdvocateCategory::options(),
                'languages' => self::LANGUAGES,
            ],
            'canonical' => route('lawyers.index'),
        ]);
    }

    public function show(Request $request, LawyerProfile $lawyer): Response
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);

        $lawyer->load([
            'user:id,name,avatar_path',
            'user.memberships' => fn ($q) => $q->where('status', 'active')
                ->whereHas('organization', fn ($o) => $o->where('type', 'firm')->where('is_public', true)),
            'user.memberships.organization:id,name,slug',
            'city:id,name,name_ur', 'province:id,name', 'district:id,name', 'barCouncil:id,name,code',
            'specializations:id,name,name_ur,slug', 'courts:id,name,name_ur', 'languages', 'educations', 'experiences', 'credentials',
            'approvedReviews' => fn ($q) => $q->with('author:id,name')->latest()->limit(20),
        ]);

        $firms = OrganizationMember::query()->where('user_id', $lawyer->user_id)->where('status', 'active')
            ->whereHas('organization', fn ($q) => $q->where('type', 'firm')->where('is_public', true))
            ->with('organization:id,name,slug')->get()->map(fn ($m) => ['name' => $m->organization->name, 'slug' => $m->organization->slug]);

        $platformCases = LegalCase::query()->whereHas('lawyers', fn ($q) => $q->whereKey($lawyer->user_id));
        $stats = [
            'cases_recorded' => (clone $platformCases)->count(),
            'active_cases' => (clone $platformCases)->whereIn('status', CaseStatus::openValues())->count(),
            'courts_represented' => (clone $platformCases)->whereNotNull('court_id')->distinct()->count('court_id'),
        ];

        $user = $request->user();

        return Inertia::render('Public/Lawyers/Show', [
            'lawyer' => [
                ...DirectoryPresenter::lawyer($lawyer),
                'bio' => app()->getLocale() === 'ur' && $lawyer->bio_ur ? $lawyer->bio_ur : $lawyer->bio,
                'enrollment_number' => $lawyer->isVerified() ? $lawyer->enrollment_number : null,
                'enrollment_date' => $lawyer->enrollment_date?->toDateString(),
                'chamber_address' => $lawyer->chamber_address,
                'public_phone' => $lawyer->public_phone,
                'public_email' => $lawyer->public_email,
                'district' => $lawyer->district?->name,
                'province' => $lawyer->province?->name,
                'courts' => $lawyer->courts->map(fn ($c) => app()->getLocale() === 'ur' && $c->name_ur ? $c->name_ur : $c->name),
                'educations' => $lawyer->educations->map->only(['degree', 'institution', 'year']),
                'experiences' => $lawyer->experiences->map->only(['position', 'organization', 'start_year', 'end_year', 'description']),
                'credentials' => $lawyer->credentials->map->only(['type', 'title', 'issuer', 'year', 'url']),
                'verified_at' => $lawyer->verified_at?->toDateString(),
                'firms' => $firms,
                'reviews' => $lawyer->approvedReviews->map(fn ($r) => ['id' => $r->id, 'rating' => $r->rating, 'title' => $r->title, 'comment' => $r->comment, 'author' => $this->initials($r->author->name), 'response' => $r->response, 'created_at' => $r->created_at->toDateString()]),
            ],
            'articles' => Article::query()->published()->where('author_id', $lawyer->user_id)->with('category:id,name')->latest('published_at')->limit(6)->get()
                ->map(fn (Article $a) => $a->toCard($lawyer->user->name)),
            'stats' => $stats,
            'isFavourite' => $user ? $user->favouriteLawyers()->whereKey($lawyer->id)->exists() : false,
            'canBook' => $lawyer->accepting_clients,
            'canonical' => route('lawyers.show', $lawyer),
        ]);
    }

    public function toggleFavourite(Request $request, LawyerProfile $lawyer): RedirectResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $request->user()->favouriteLawyers()->toggle([$lawyer->id]);

        return back();
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        return ($parts[0] ?? '').(isset($parts[1]) ? ' '.mb_substr($parts[1], 0, 1).'.' : '');
    }
}
