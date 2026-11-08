<?php

namespace App\Support;

use App\Models\BarCouncil;
use App\Models\City;
use App\Models\Court;
use App\Models\District;
use App\Models\Judge;
use App\Models\Organization;
use App\Models\Province;
use App\Models\Specialization;
use Illuminate\Support\Facades\Cache;

/**
 * Select-option payloads for reference data, localized and cached.
 * Cache is flushed by admin reference controllers via {@see flush()}.
 */
class ReferenceOptions
{
    private static function localized(string $key, callable $callback): array
    {
        $locale = app()->getLocale();

        return Cache::remember("ref:{$key}:{$locale}", now()->addHours(6), $callback);
    }

    private static function label(object $model): string
    {
        return app()->getLocale() === 'ur' && ! empty($model->name_ur) ? $model->name_ur : $model->name;
    }

    /** @return list<array{value:int,label:string,district_id:int|null,court_type:string|null}> */
    public static function courts(): array
    {
        return self::localized('courts', fn () => Court::query()->with('courtType:id,slug')->where('is_active', true)->orderBy('name')->get()
            ->map(fn (Court $c) => ['value' => $c->id, 'label' => self::label($c), 'district_id' => $c->district_id, 'court_type' => $c->courtType?->slug])->all());
    }

    /** @return list<array{value:int,label:string,court_id:int}> */
    public static function judges(): array
    {
        return self::localized('judges', fn () => Judge::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'court_id', 'designation'])
            ->map(fn (Judge $j) => ['value' => $j->id, 'label' => $j->name.($j->designation ? ' ('.$j->designation.')' : ''), 'court_id' => $j->court_id])->all());
    }

    public static function specializations(): array
    {
        return self::localized('specializations', fn () => Specialization::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn ($s) => ['value' => $s->id, 'label' => self::label($s), 'slug' => $s->slug])->all());
    }

    public static function provinces(): array
    {
        return self::localized('provinces', fn () => Province::query()->orderBy('sort_order')->get()->map(fn ($p) => ['value' => $p->id, 'label' => self::label($p)])->all());
    }

    public static function districts(): array
    {
        return self::localized('districts', fn () => District::query()->orderBy('name')->get()->map(fn ($d) => ['value' => $d->id, 'label' => self::label($d), 'province_id' => $d->province_id])->all());
    }

    public static function cities(): array
    {
        return self::localized('cities', fn () => City::query()->with('district:id,province_id')->orderBy('name')->get()
            ->map(fn ($c) => ['value' => $c->id, 'label' => self::label($c), 'district_id' => $c->district_id, 'province_id' => $c->district?->province_id, 'slug' => $c->slug])->all());
    }

    public static function barCouncils(): array
    {
        return self::localized('bar-councils', fn () => BarCouncil::query()->orderBy('name')->get()->map(fn ($b) => ['value' => $b->id, 'label' => self::label($b)])->all());
    }

    /** Active members of an organization (not cached — membership changes often). */
    public static function members(Organization $organization, bool $advocatesOnly = false): array
    {
        return $organization->activeMembers()->with('user:id,name')->get()
            ->filter(fn ($m) => ! $advocatesOnly || $m->role->isAdvocate())
            ->map(fn ($m) => ['value' => $m->user_id, 'label' => $m->user->name, 'role' => $m->role->value])
            ->sortBy('label')->values()->all();
    }

    public static function clients(Organization $organization): array
    {
        return $organization->clients()->orderBy('name')->get(['id', 'name', 'phone'])
            ->map(fn ($c) => ['value' => $c->id, 'label' => $c->name.($c->phone ? ', '.$c->phone : '')])->all();
    }

    public static function flush(): void
    {
        foreach (['courts', 'judges', 'specializations', 'provinces', 'districts', 'cities', 'bar-councils'] as $key) {
            foreach (['en', 'ur'] as $locale) {
                Cache::forget("ref:{$key}:{$locale}");
            }
        }
    }
}
