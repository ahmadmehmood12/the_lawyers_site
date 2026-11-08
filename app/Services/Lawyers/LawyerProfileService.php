<?php

namespace App\Services\Lawyers;

use App\Models\LawyerProfile;
use App\Models\User;
use Illuminate\Support\Str;

class LawyerProfileService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createFor(User $user, array $attributes = []): LawyerProfile
    {
        $profile = $user->lawyerProfile()->firstOrNew([]);

        if (! $profile->exists) {
            $profile->slug = $this->uniqueSlug($user->name);
        }

        $profile->fill($attributes)->save();

        return $profile;
    }

    public function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug('adv '.$name) ?: 'advocate';
        $slug = $base;
        $i = 2;

        while (LawyerProfile::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
