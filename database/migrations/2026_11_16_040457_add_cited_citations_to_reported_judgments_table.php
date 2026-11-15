<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Case law cited inside a reported judgment (PLD 2026 Lahore 172, 2026 CLC 1150, ...), read from
 * the PDF by the LHC scraper. Searched together with the judgment's own citation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->text('cited_citations')->nullable()->after('citation');
            $table->index('citation');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropIndex(['citation']);
            $table->dropColumn('cited_citations');
        });
    }
};
