<?php

use App\Models\ReportedJudgment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Judgments naming two or more judges are Division Benches. LHC/PHC/SC imports never set the flag,
 * so mark them once; new saves do it in ReportedJudgment::booted(). Never switches a flag off.
 */
return new class extends Migration
{
    public function up(): void
    {
        $ids = [];
        DB::table('reported_judgments')->where('bench', false)->select(['id', 'judges'])->orderBy('id')->chunk(1000, function ($rows) use (&$ids): void {
            foreach ($rows as $row) {
                if (count(ReportedJudgment::judgeNames($row->judges)) > 1) {
                    $ids[] = $row->id;
                }
            }
        });

        foreach (array_chunk($ids, 1000) as $chunk) {
            DB::table('reported_judgments')->whereIn('id', $chunk)->update(['bench' => true]);
        }
        Cache::forget('judgment-judges');
    }

    public function down(): void
    {
        // Data backfill; nothing to undo safely.
    }
};
