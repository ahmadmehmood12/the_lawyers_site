<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Judgments approved for reporting, per High Court (Admin, Reported judgments; public /reported-judgments). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reported_judgments', function (Blueprint $table) {
            $table->id();
            $table->string('court', 10);
            $table->string('case_type', 160);
            $table->string('case_number', 60);
            $table->string('title', 500);
            $table->string('judges', 500);
            $table->string('citation', 120)->nullable();
            $table->text('tag_line')->nullable();
            $table->date('decision_date')->nullable();
            $table->date('uploaded_on');
            $table->string('pdf_path')->nullable();
            $table->string('source_url', 500)->nullable();
            $table->string('slug')->unique();
            $table->boolean('is_published')->default(true);
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();

            $table->index(['court', 'is_published', 'uploaded_on']);
            $table->index('decision_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reported_judgments');
    }
};
