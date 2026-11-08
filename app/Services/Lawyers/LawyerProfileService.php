<?php

namespace App\Services\Lawyers;

use App\Models\LawyerProfile;
use App\Models\User;
use Illuminate\Support\Str;

class LawyerProfileService
{
    public function createFor(User $user): LawyerProfile
    {
        return $user->lawyerProfile()->firstOrCreate([], ['slug' => $this->uniqueSlug($user->name)]);
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
