<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fields the Sindh High Court listing adds and the PDF full-text indexer records.
 *
 * - bench: 1 = Division Bench (D.B.), 0 = Single Bench (S.B.), read from the case label.
 * - apex_court_case / apex_court_status: the Supreme Court appeal reference and its status
 *   (the last two columns of the SHC reported-judgments table), empty on most rows.
 * - text_extracted_at / ocr_used / page_count / extraction_status: let the indexer skip
 *   PDFs it has already read and record whether OCR was needed (see judgment_pages).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->boolean('bench')->default(false)->after('judges');
            $table->string('apex_court_case', 255)->nullable()->after('bench');
            $table->string('apex_court_status', 255)->nullable()->after('apex_court_case');
            $table->timestamp('text_extracted_at')->nullable()->after('views');
            $table->boolean('ocr_used')->default(false)->after('text_extracted_at');
            $table->unsignedSmallInteger('page_count')->nullable()->after('ocr_used');
            $table->string('extraction_status', 20)->nullable()->after('page_count');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropColumn(['bench', 'apex_court_case', 'apex_court_status', 'text_extracted_at', 'ocr_used', 'page_count', 'extraction_status']);
        });
    }
};
