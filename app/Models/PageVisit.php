<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/**
 * A public page view, recorded by RecordPageVisit for the admin Analytics dashboard.
 * Visitors and sessions are salted hashes; no IP address or user agent is kept.
 *
 * @property string $source direct|search|facebook|instagram|linkedin|youtube|x|whatsapp|referral
 */
class PageVisit extends Model
{
    use MassPrunable;

    public const SOCIAL = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];

    public const SOURCES = ['direct', 'search', 'facebook', 'instagram', 'linkedin', 'youtube', 'x', 'whatsapp', 'referral'];

    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'visited_at' => 'datetime',
            'visited_on' => 'date',
            'is_entry' => 'boolean',
        ];
    }

    public function prunable(): Builder
    {
        return static::query()->where('visited_on', '<', now()->subDays(max(30, (int) config('analytics.retention_days')))->toDateString());
    }
}
