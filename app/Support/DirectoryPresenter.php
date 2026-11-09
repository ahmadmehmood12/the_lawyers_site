<?php

namespace App\Support;

use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Models\Specialization;

/**
 * Shapes public directory records for the shared React cards. Used by the
 * public directory, the profile page and the admin dashboard snapshot.
 */
class DirectoryPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function lawyer(LawyerProfile $p): array
    {
        $ur = app()->getLocale() === 'ur';
        $degree = $p->relationLoaded('educations') ? $p->educations->first() : null;
        $firm = $p->relationLoaded('user') && $p->user->relationLoaded('memberships')
            ? $p->user->memberships->first()?->organization
            : null;

        return [
            'slug' => $p->slug,
            'name' => trim(($p->title ? $p->title.' ' : '').$p->user->name),
            'headline' => $p->headline,
            'photo_url' => PublicFile::url($p->photo_path) ?? PublicFile::url($p->user->avatar_path),
            'city' => $p->city ? ($ur && $p->city->name_ur ? $p->city->name_ur : $p->city->name) : null,
            'specializations' => $p->specializations->map(fn ($s) => ['slug' => $s->slug, 'name' => $ur && $s->name_ur ? $s->name_ur : $s->name])->values(),
            'bar_council' => $p->barCouncil?->name,
            'category' => $p->advocate_category?->value,
            'category_label' => $p->advocate_category?->label(),
            'years_experience' => $p->yearsOfExperience(),
            'languages' => $p->relationLoaded('languages') ? $p->languages->pluck('language')->values()->all() : [],
            'degree' => $degree ? ['degree' => $degree->degree, 'institution' => $degree->institution, 'year' => $degree->year] : null,
            'courts' => $p->relationLoaded('courts') ? $p->courts->map(fn ($c) => $ur && $c->name_ur ? $c->name_ur : $c->name)->values()->all() : [],
            'firm' => $firm ? ['name' => $firm->name, 'slug' => $firm->slug] : null,
            'fee_min' => $p->consultation_fee_min,
            'fee_max' => $p->consultation_fee_max,
            'offers_online' => $p->offers_online,
            'offers_in_person' => $p->offers_in_person,
            'accepting_clients' => $p->accepting_clients,
            'verified' => $p->isVerified(),
            'rating' => $p->rating_count > 0 ? (float) $p->rating_average : null,
            'rating_count' => $p->rating_count,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function firm(Organization $o): array
    {
        $ur = app()->getLocale() === 'ur';

        return [
            'slug' => $o->slug,
            'name' => $o->name,
            'city' => $o->city ? ($ur && $o->city->name_ur ? $o->city->name_ur : $o->city->name) : null,
            'logo_url' => PublicFile::url($o->logo_path),
            'members' => $o->active_members_count ?? $o->activeMembers()->count(),
            'founded_year' => $o->founded_year,
            'excerpt' => str($ur && $o->description_ur ? $o->description_ur : $o->description)->limit(180)->toString(),
            'focus' => Specialization::query()
                ->whereHas('lawyers', fn ($q) => $q->whereIn('user_id', $o->activeMembers()->select('user_id')))
                ->orderBy('sort_order')->limit(4)
                ->get(['name', 'name_ur'])
                ->map(fn (Specialization $s) => $ur && $s->name_ur ? $s->name_ur : $s->name)
                ->all(),
        ];
    }
}
