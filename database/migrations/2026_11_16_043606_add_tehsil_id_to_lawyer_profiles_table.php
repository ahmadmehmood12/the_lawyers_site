<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Optional tehsil of the lawyer's chamber (Profile, Chamber & consultations). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lawyer_profiles', function (Blueprint $table) {
            $table->foreignId('tehsil_id')->nullable()->after('district_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lawyer_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tehsil_id');
        });
    }
};
