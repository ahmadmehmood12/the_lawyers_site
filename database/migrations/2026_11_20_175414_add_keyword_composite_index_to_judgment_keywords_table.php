<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A covering index on (keyword, reported_judgment_id): "find every judgment that has keyword X"
 * is answered from the index alone, without touching the table. It makes the old single-column
 * `keyword` index redundant (it is a left-prefix of this one), so that one is dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('judgment_keywords', function (Blueprint $table) {
            $table->index(['keyword', 'reported_judgment_id'], 'judgment_keywords_keyword_jid_index');
            $table->dropIndex('judgment_keywords_keyword_index');
        });
    }

    public function down(): void
    {
        Schema::table('judgment_keywords', function (Blueprint $table) {
            $table->index('keyword', 'judgment_keywords_keyword_index');
            $table->dropIndex('judgment_keywords_keyword_jid_index');
        });
    }
};
