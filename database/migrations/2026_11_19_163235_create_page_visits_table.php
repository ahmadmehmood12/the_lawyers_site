<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per public page view (admin analytics). No raw IP address or user agent is stored:
 * visitors and sessions are salted SHA-256 hashes. Rows older than config('analytics.retention_days')
 * are pruned by model:prune.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_visits', function (Blueprint $table) {
            $table->id();
            $table->dateTime('visited_at');
            $table->date('visited_on');
            $table->string('path', 255);
            $table->string('route_name', 120)->nullable();
            $table->string('subject_type', 30)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('source', 20);
            $table->string('referrer_host', 120)->nullable();
            $table->string('utm_source', 80)->nullable();
            $table->string('utm_medium', 80)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->char('visitor_hash', 64);
            $table->char('session_hash', 64);
            $table->boolean('is_entry')->default(false);
            $table->string('device', 10);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->index(['visited_on', 'source']);
            $table->index(['visited_on', 'visitor_hash']);
            $table->index(['visited_on', 'session_hash']);
            $table->index(['subject_type', 'subject_id', 'visited_on']);
            $table->index('visited_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_visits');
    }
};
