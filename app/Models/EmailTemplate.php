<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Admin-edited wording for a notification email (key = notification event, e.g.
 * appointment_booked). Placeholders like :name, :lawyer, :date are filled per message.
 * Missing or inactive rows fall back to the built-in wording.
 */
#[Fillable(['key', 'language', 'subject', 'heading', 'intro', 'outro', 'is_active'])]
class EmailTemplate extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
