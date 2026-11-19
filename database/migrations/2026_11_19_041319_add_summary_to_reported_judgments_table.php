<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI summary written by the scrapers after reading the judgment (overview, facts, issues, held,
 * reasoning, laws, outcome). Shown under the PDF on the judgment page, marked as AI generated.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->json('summary')->nullable()->after('remarks');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropColumn('summary');
        });
    }
};
