<?php

namespace App\Http\Controllers\Public;

use App\Enums\OrganizationType;
use App\Http\Controllers\Controller;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Support\ReferenceOptions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FirmDirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $firms = Organization::query()->where('type', OrganizationType::Firm->value)->where('is_public', true)->where('status', 'active')
            ->with('city:id,name,slug')->withCount('activeMembers')
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->string('city')->toString(), fn ($q, $slug) => $q->whereHas('city', fn ($c) => $c->where('slug', $slug)))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (Organization $o) => $this->card($o));

        return Inertia::render('Public/Firms/Index', [
            'firms' => $firms,
            'filters' => $request->only(['search', 'city']),
            'cities' => ReferenceOptions::cities(),
            'canonical' => route('firms.index'),
        ]);
    }

    public function show(Organization $firm): Response
    {
        abort_unless($firm->type === OrganizationType::Firm && $firm->is_public && $firm->status === 'active', 404);
        $firm->load('city:id,name');

        $lawyers = LawyerProfile::query()->listed()
            ->whereIn('user_id', $firm->activeMembers()->select('user_id'))
            ->with(['user:id,name', 'specializations:id,name,slug', 'city:id,name'])->get()
            ->map(fn ($p) => ['slug' => $p->slug, 'name' => $p->user->name, 'headline' => $p->headline, 'verified' => $p->isVerified(), 'photo_url' => $p->photo_path ? Storage::disk('public')->url($p->photo_path) : null, 'specializations' => $p->specializations->pluck('name')]);

        return Inertia::render('Public/Firms/Show', [
            'firm' => [...$this->card($firm), 'description' => app()->getLocale() === 'ur' && $firm->description_ur ? $firm->description_ur : $firm->description, 'address' => $firm->address, 'phone' => $firm->phone, 'email' => $firm->email, 'website' => $firm->website, 'founded_year' => $firm->founded_year],
            'lawyers' => $lawyers,
            'canonical' => route('firms.show', $firm),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function card(Organization $o): array
    {
        return [
            'slug' => $o->slug,
            'name' => $o->name,
            'city' => $o->city?->name,
            'logo_url' => $o->logo_path ? Storage::disk('public')->url($o->logo_path) : null,
            'members' => $o->active_members_count ?? null,
            'excerpt' => str($o->description)->limit(160)->toString(),
        ];
    }
}
