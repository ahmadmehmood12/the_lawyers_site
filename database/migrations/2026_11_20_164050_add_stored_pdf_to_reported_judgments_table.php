<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When a scraper downloads a judgment PDF, the file is stored on the private `local` disk and
 * served by the site itself (so the viewer always works and downloads can be plan-gated),
 * instead of only linking out to the court website.
 *
 * - stored_pdf_path: path on the private disk (null = not downloaded, still an external link).
 * - source_pdf_url: the original court PDF URL the file was downloaded from (for reference / re-download).
 * - pdf_bytes: file size, for display.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->string('stored_pdf_path')->nullable()->after('pdf_path');
            $table->string('source_pdf_url', 500)->nullable()->after('stored_pdf_path');
            $table->unsignedBigInteger('pdf_bytes')->nullable()->after('source_pdf_url');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropColumn(['stored_pdf_path', 'source_pdf_url', 'pdf_bytes']);
        });
    }
};
