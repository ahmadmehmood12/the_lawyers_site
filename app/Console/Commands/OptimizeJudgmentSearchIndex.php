<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Rebuilds / compacts the judgment search indexes.
 *
 * B-tree indexes (keyword, citation, dates …) maintain themselves on every insert and update and
 * never need this. The one that benefits is the InnoDB FULLTEXT index on judgment_pages.body: after
 * a large bulk import it accumulates a hidden "deleted" cache and many small index segments, which
 * an OPTIMIZE TABLE merges. Run this after the first full scrape, then occasionally (e.g. weekly),
 * not after every daily run of a few new judgments.
 */
class OptimizeJudgmentSearchIndex extends Command
{
    protected $signature = 'judgments:optimize-search-index';

    protected $description = 'Compact the FULLTEXT search index on judgment_pages (run after a large import).';

    public function handle(): int
    {
        // Merge only the FULLTEXT index instead of rebuilding the whole table, when the server allows it.
        try {
            DB::statement('SET GLOBAL innodb_optimize_fulltext_only = ON');
        } catch (\Throwable $e) {
            $this->warn('Could not set innodb_optimize_fulltext_only (needs privilege); OPTIMIZE will rebuild the whole table instead.');
        }

        foreach (['judgment_pages', 'judgment_keywords'] as $table) {
            $this->info("Optimizing {$table} …");
            DB::statement("OPTIMIZE TABLE {$table}");
        }

        rescue(fn () => DB::statement('SET GLOBAL innodb_optimize_fulltext_only = OFF'), null, false);
        $this->info('Done.');

        return self::SUCCESS;
    }
}
