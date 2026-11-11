<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Admin-managed FAQs: homepage section (show_on_home) and the /faqs page (docs/Modules/Showcase.md). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('category', 60)->nullable();
            $table->string('question');
            $table->string('question_ur')->nullable();
            $table->text('answer');
            $table->text('answer_ur')->nullable();
            $table->boolean('show_on_home')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
    }
};
