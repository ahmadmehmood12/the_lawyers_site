<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Supreme Court judgments carry their own SC citation ("2018 SCP 131") beside the report citation. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->string('sc_citation', 120)->nullable()->after('other_citation');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropColumn('sc_citation');
        });
    }
};
