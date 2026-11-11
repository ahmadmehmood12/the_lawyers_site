<?php

namespace App\Models;

use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Person in the homepage founders / patrons / legal team section. */
#[Fillable(['team_designation_id', 'name', 'photo_path', 'bio', 'qualifications', 'experience', 'linkedin_url', 'profile_url', 'is_active', 'sort_order'])]
class TeamMember extends Model
{
    /** @var array<string, mixed> */
    protected $attributes = ['is_active' => true, 'sort_order' => 0];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(TeamDesignation::class, 'team_designation_id');
    }

    /** @return array<string, mixed> */
    public function toPublicArray(bool $urdu = false): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'designation' => $this->designation ? ($urdu && $this->designation->name_ur ? $this->designation->name_ur : $this->designation->name) : null,
            'photo_url' => PublicFile::url($this->photo_path),
            'bio' => $this->bio,
            'qualifications' => $this->qualifications,
            'experience' => $this->experience,
            'linkedin_url' => $this->linkedin_url,
            'profile_url' => $this->profile_url,
        ];
    }
}
