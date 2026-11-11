<?php

namespace App\Services\Directory;

use App\Models\User;
use App\Support\PublicFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The advocate shown in the homepage and sign-in animations (docs/Features/Home-Page.md):
 * the listed lawyer with the busiest real practice (most cases), preferring one with a photo.
 * Counts are that lawyer's own records, so the animated dashboard shows real totals.
 */
class DemoPersona
{
    /** Names left out so the demo does not reuse the most common placeholder names. */
    private const SKIP = ['fatima', 'ayesha', 'aisha'];

    /** @return array{name: string, first_name: string, photo_url: ?string, city: ?string, counts: array<string, int>}|null */
    public function get(): ?array
    {
        return Cache::remember('demo-persona', now()->addHours(6), function () {
            $query = User::query()->select('users.*')
                ->join('lawyer_profiles', 'lawyer_profiles.user_id', '=', 'users.id')
                ->addSelect(['cases_count' => DB::table('case_lawyer')->selectRaw('COUNT(*)')->whereColumn('case_lawyer.user_id', 'users.id')])
                ->with('lawyerProfile.city:id,name');

            foreach (self::SKIP as $name) {
                $query->where('users.name', 'not like', "%{$name}%");
            }

            $user = $query->orderByRaw('users.avatar_path IS NULL')->orderByDesc('cases_count')->first();

            if (! $user) {
                return null;
            }

            $organization = $user->current_organization_id;
            $count = fn (string $table, string $column, mixed $value) => (int) DB::table($table)->where($column, $value)->count();

            return [
                'name' => $user->name,
                'first_name' => (string) str($user->name)->replaceMatches('/^(Adv\.?|Advocate|Barrister|Mr\.?|Ms\.?|Mrs\.?)\s+/i', '')->before(' '),
                'photo_url' => PublicFile::url($user->avatar_path),
                'city' => $user->lawyerProfile?->city?->name,
                'counts' => [
                    'cases' => (int) $user->cases_count,
                    'hearings' => $count('hearings', 'assigned_lawyer_id', $user->id),
                    'appointments' => $count('appointments', 'lawyer_id', $user->id),
                    'tasks' => $count('tasks', 'assigned_to', $user->id),
                    'drafts' => $organization ? $count('drafts', 'organization_id', $organization) : 0,
                    'clients' => $organization ? $count('clients', 'organization_id', $organization) : 0,
                ],
            ];
        });
    }
}
