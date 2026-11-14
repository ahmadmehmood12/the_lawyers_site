<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** A lawyer can mark one or more positions as current ("present") on the public profile. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lawyer_experiences', function (Blueprint $table) {
            $table->boolean('is_current')->default(false)->after('end_year');
        });

        // Rows with a start year and no end year were shown as "present" before; keep that.
        DB::table('lawyer_experiences')->whereNotNull('start_year')->whereNull('end_year')->update(['is_current' => true]);
    }

    public function down(): void
    {
        Schema::table('lawyer_experiences', fn (Blueprint $table) => $table->dropColumn('is_current'));
    }
};
