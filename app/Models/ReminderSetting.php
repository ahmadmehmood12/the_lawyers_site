<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'event', 'days_before', 'notify_lawyer', 'notify_client'])]
class ReminderSetting extends Model
{
    use BelongsToOrganization;

    /** @var array<string, mixed> Mirrors DB defaults so new instances are complete. */
    protected $attributes = ['notify_lawyer' => true, 'notify_client' => false];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'notify_lawyer' => 'boolean',
            'notify_client' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
