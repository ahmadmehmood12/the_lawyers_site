<?php

namespace App\Http\Controllers\Public;

use App\Enums\OrganizationType;
use App\Http\Controllers\Controller;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Support\DirectoryPresenter;
use App\Support\PublicFile;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FirmDirectoryController extends Controller
{
    /**
     * Public law firms (web /firms and GET /api/v1/firms).
     *
     * @return Builder<Organization>
     */
    public static function search(?string $search, ?string $citySlug): Builder
    {
        return Organization::query()->where('type', OrganizationType::Firm->value)->where('is_public', true)->where('status', 'active')
            ->with('city:id,name,name_ur,slug')->withCount('activeMembers')
            ->when($search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($citySlug, fn ($q, $slug) => $q->whereHas('city', fn ($c) => $c->where('slug', $slug)))
            ->orderBy('name');
    }

    /**
     * Firm profile with its listed lawyers (web and GET /api/v1/firms/{slug}).
     *
     * @return array{firm: array<string, mixed>, lawyers: mixed}
     */
    public static function profile(Organization $firm): array
    {
        abort_unless($firm->type === OrganizationType::Firm && $firm->is_public && $firm->status === 'active', 404);
        $firm->load('city:id,name,name_ur');

        $lawyers = LawyerProfile::query()->listed()
            ->whereIn('user_id', $firm->activeMembers()->select('user_id'))
            ->with(['user:id,name,avatar_path', 'specializations:id,name,slug', 'city:id,name'])->get()
            ->map(fn ($p) => ['slug' => $p->slug, 'name' => $p->user->name, 'headline' => $p->headline, 'verified' => $p->isVerified(), 'photo_url' => PublicFile::url($p->photo_path), 'specializations' => $p->specializations->pluck('name')]);

        return [
            'firm' => [...DirectoryPresenter::firm($firm), 'description' => app()->getLocale() === 'ur' && $firm->description_ur ? $firm->description_ur : $firm->description, 'address' => $firm->address, 'phone' => $firm->phone, 'email' => $firm->email, 'website' => $firm->website, 'founded_year' => $firm->founded_year],
            'lawyers' => $lawyers,
        ];
    }

    public function index(Request $request, ?string $embedded = null): Response
    {
        $firms = self::search($request->string('search')->trim()->toString(), $request->string('city')->toString())
            ->paginate(12)->withQueryString()
            ->through(fn (Organization $o) => DirectoryPresenter::firm($o));

        return Inertia::render('Public/Firms/Index', [
            'firms' => $firms,
            'filters' => $request->only(['search', 'city']),
            'cities' => ReferenceOptions::cities(),
            'canonical' => route('firms.index'),
            'embedded' => $embedded,
        ]);
    }

    public function show(Organization $firm, ?string $embedded = null): Response
    {
        return Inertia::render('Public/Firms/Show', [
            ...self::profile($firm),
            'canonical' => route('firms.show', $firm),
            'embedded' => $embedded,
        ]);
    }
}
