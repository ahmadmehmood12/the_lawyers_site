<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A judge and their current posting (court, district, tehsil, courtroom). Moves are logged in judge_transfers. */
#[Fillable(['court_id', 'district_id', 'tehsil_id', 'name', 'designation', 'courtroom', 'posted_on', 'is_active'])]
class Judge extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'posted_on' => 'date',
        ];
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function tehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class);
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(JudgeTransfer::class)->latest('effective_on')->latest('id');
    }

    /** @return array{court_id: int|null, district_id: int|null, tehsil_id: int|null, courtroom: string|null} */
    public function posting(): array
    {
        return ['court_id' => $this->court_id, 'district_id' => $this->district_id, 'tehsil_id' => $this->tehsil_id, 'courtroom' => $this->courtroom];
    }
}
