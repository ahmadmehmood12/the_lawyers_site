<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Meaningful keywords and legal phrases extracted from each judgment's text, with the
 * number of times each one appears. This is a supplementary index for fast exact-keyword
 * matching and "related terms" chips; the complete text still lives in judgment_pages.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('judgment_keywords', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reported_judgment_id')->constrained()->cascadeOnDelete();
            $table->string('keyword', 190);
            $table->unsignedInteger('frequency')->default(1);
            $table->timestamps();

            $table->unique(['reported_judgment_id', 'keyword']);
            $table->index('keyword');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('judgment_keywords');
    }
};
