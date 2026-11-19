<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jira-style reporter: the person who raised the task. Defaults to the creator
 * but can be changed; existing tasks are backfilled from created_by.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('reporter_id')->nullable()->after('assigned_to')->constrained('users')->nullOnDelete();
        });

        DB::table('tasks')->whereNull('reporter_id')->update(['reporter_id' => DB::raw('created_by')]);
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reporter_id');
        });
    }
};
