<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Scopes audit entries to the organization they happened in, so a firm's activity
 * feed can be read without loading every subject (docs/Modules/Activity-Feed.md).
 * Existing rows are backfilled from their subject's organization_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('log_name');
            $table->index(['organization_id', 'id']);
        });

        $tables = [
            'App\\Models\\LegalCase' => 'legal_cases',
            'App\\Models\\Hearing' => 'hearings',
            'App\\Models\\Invoice' => 'invoices',
            'App\\Models\\Payment' => 'payments',
            'App\\Models\\Draft' => 'drafts',
            'App\\Models\\Client' => 'clients',
        ];

        foreach ($tables as $type => $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'organization_id')) {
                DB::table('activity_log')->where('subject_type', $type)->whereNull('organization_id')
                    ->update(['organization_id' => DB::raw("(select {$table}.organization_id from {$table} where {$table}.id = activity_log.subject_id)")]);
            }
        }

        DB::table('activity_log')->where('subject_type', 'App\\Models\\Organization')->whereNull('organization_id')->update(['organization_id' => DB::raw('subject_id')]);
    }

    public function down(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'id']);
            $table->dropColumn('organization_id');
        });
    }
};
