<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Some court PDF / page URLs (long query strings, encoded file names) are longer than 255
 * characters, so scraper uploads failed with "Data too long for column 'pdf_path'".
 * Widen every URL / path column on reported judgments to 1000 characters.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->string('pdf_path', 1000)->nullable()->change();
            $table->string('stored_pdf_path', 1000)->nullable()->change();
            $table->string('source_pdf_url', 1000)->nullable()->change();
            $table->string('source_url', 1000)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->string('pdf_path')->nullable()->change();
            $table->string('stored_pdf_path')->nullable()->change();
            $table->string('source_pdf_url', 500)->nullable()->change();
            $table->string('source_url', 500)->nullable()->change();
        });
    }
};
