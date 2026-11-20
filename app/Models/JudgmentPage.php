<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One page of a judgment PDF's extracted text; searched with a FULLTEXT index on `body`. */
#[Fillable(['reported_judgment_id', 'page_number', 'body'])]
class JudgmentPage extends Model
{
    protected function casts(): array
    {
        return ['page_number' => 'integer'];
    }

    /** @return BelongsTo<ReportedJudgment, $this> */
    public function judgment(): BelongsTo
    {
        return $this->belongsTo(ReportedJudgment::class, 'reported_judgment_id');
    }
}
