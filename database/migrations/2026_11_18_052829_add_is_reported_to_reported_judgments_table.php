<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1 = approved for reporting by the court, 0 = unreported. LHC and PHC listings and the Supreme
 * Court "Reported = Yes" search only contain reported judgments, so existing rows are 1.
 * The public Reported judgments pages show reported ones only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->boolean('is_reported')->default(true)->after('is_published');
            $table->index(['court', 'is_reported', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropIndex(['court', 'is_reported', 'is_published']);
            $table->dropColumn('is_reported');
        });
    }
};
