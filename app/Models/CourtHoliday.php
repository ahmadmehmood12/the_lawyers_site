<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

/**
 * A day or range when courts are closed (public holiday, court vacation or other). Shown on the
 * homepage, dashboards, the client portal and every calendar. `tentative` marks moon sighting dates.
 */
#[Fillable(['title', 'title_ur', 'starts_on', 'ends_on', 'kind', 'province_id', 'notes', 'tentative', 'is_active'])]
class CourtHoliday extends Model
{
    public const KINDS = ['public_holiday', 'court_vacation', 'other'];

    public const CACHE_KEY = 'court-holidays-upcoming';

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date', 'tentative' => 'boolean', 'is_active' => 'boolean'];
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /** @return array<string, mixed> */
    public function toPublic(): array
    {
        $ur = app()->getLocale() === 'ur';

        return [
            'id' => $this->id,
            'title' => $ur && $this->title_ur ? $this->title_ur : $this->title,
            'starts_on' => $this->starts_on->toDateString(),
            'ends_on' => $this->ends_on->toDateString(),
            'days' => (int) $this->starts_on->diffInDays($this->ends_on) + 1,
            'kind' => $this->kind,
            'province' => $this->province?->name,
            'tentative' => $this->tentative,
            'notes' => $this->notes,
        ];
    }

    /** Active holidays that have not ended yet, soonest first (cached; flushed on admin save). */
    public static function upcoming(int $limit = 6): array
    {
        return array_slice(Cache::remember(self::CACHE_KEY.'-'.app()->getLocale().'-'.now()->toDateString(), now()->addHours(6), fn () => static::query()
            ->where('is_active', true)->whereDate('ends_on', '>=', today())->with('province:id,name')
            ->orderBy('starts_on')->limit(30)->get()->map->toPublic()->all()), 0, $limit);
    }

    public static function flush(): void
    {
        foreach (['en', 'ur'] as $locale) {
            Cache::forget(self::CACHE_KEY.'-'.$locale.'-'.now()->toDateString());
        }
    }
}
