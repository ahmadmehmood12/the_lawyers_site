<?php

namespace App\Services\Support;

use App\Models\NumberSequence;
use App\Models\Organization;
use Illuminate\Support\Facades\DB;

/**
 * Gap-free, per-organization, per-year numbering (CASE-2026-0001, INV-2026-0001, RCT-…).
 * Uses a row lock so concurrent requests never issue the same number.
 */
class NumberSequencer
{
    public const PREFIXES = ['case' => 'CASE', 'invoice' => 'INV', 'receipt' => 'RCT'];

    public function next(Organization $organization, string $type, ?int $year = null): string
    {
        $year ??= (int) now()->year;

        return DB::transaction(function () use ($organization, $type, $year): string {
            NumberSequence::query()->insertOrIgnore([
                'organization_id' => $organization->id, 'type' => $type, 'year' => $year, 'last_number' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);

            $sequence = NumberSequence::query()
                ->where(['organization_id' => $organization->id, 'type' => $type, 'year' => $year])
                ->lockForUpdate()
                ->firstOrFail();

            $sequence->increment('last_number');

            return sprintf('%s-%d-%04d', self::PREFIXES[$type] ?? strtoupper($type), $year, $sequence->last_number);
        });
    }
}
