<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A meaningful keyword or legal phrase from a judgment's text, with how often it appears. */
#[Fillable(['reported_judgment_id', 'keyword', 'frequency'])]
class JudgmentKeyword extends Model
{
    protected function casts(): array
    {
        return ['frequency' => 'integer'];
    }

    /** @return BelongsTo<ReportedJudgment, $this> */
    public function judgment(): BelongsTo
    {
        return $this->belongsTo(ReportedJudgment::class, 'reported_judgment_id');
    }
}
