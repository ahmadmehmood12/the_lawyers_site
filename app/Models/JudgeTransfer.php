<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One move of a judge: a transfer, or one side of a swap with another judge (Admin\JudgeTransferController). */
#[Fillable(['judge_id', 'kind', 'swapped_with_id', 'from_court_id', 'from_district_id', 'from_tehsil_id', 'from_courtroom', 'to_court_id', 'to_district_id', 'to_tehsil_id', 'to_courtroom', 'effective_on', 'note', 'created_by'])]
class JudgeTransfer extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['effective_on' => 'date'];
    }

    public function judge(): BelongsTo
    {
        return $this->belongsTo(Judge::class);
    }

    public function swappedWith(): BelongsTo
    {
        return $this->belongsTo(Judge::class, 'swapped_with_id');
    }

    public function fromCourt(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'from_court_id');
    }

    public function toCourt(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'to_court_id');
    }

    public function fromDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'from_district_id');
    }

    public function toDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'to_district_id');
    }

    public function fromTehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class, 'from_tehsil_id');
    }

    public function toTehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class, 'to_tehsil_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
