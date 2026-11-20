<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The full text of each judgment PDF, stored one row per page so a search can point
 * the reader at the exact page a phrase appears on. Filled by the scraper's PDF text
 * indexer (PyMuPDF, with Tesseract OCR for scanned pages). The original text is kept
 * whole here; judgment_keywords is a supplementary index, never a replacement.
 *
 * A MySQL FULLTEXT index on `body` powers phrase and natural-language search.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('judgment_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reported_judgment_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('page_number');
            $table->mediumText('body');
            $table->timestamps();

            $table->unique(['reported_judgment_id', 'page_number']);
        });

        // InnoDB FULLTEXT index for phrase (IN BOOLEAN MODE) and natural-language search.
        DB::statement('ALTER TABLE judgment_pages ADD FULLTEXT judgment_pages_body_fulltext (body)');
    }

    public function down(): void
    {
        Schema::dropIfExists('judgment_pages');
    }
};
