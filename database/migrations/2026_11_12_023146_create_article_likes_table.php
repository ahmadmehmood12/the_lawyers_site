<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Article likes: one per signed-in user, counted on articles.likes_count (docs/Features/Articles.md). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->unsignedInteger('likes_count')->default(0)->after('views');
            $table->index(['status', 'likes_count']);
        });

        Schema::create('article_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['article_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_likes');

        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex(['status', 'likes_count']);
            $table->dropColumn('likes_count');
        });
    }
};
