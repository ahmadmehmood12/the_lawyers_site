<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Peshawar High Court listings carry a remarks headnote (often several paragraphs) and the
 * judgment's citation in a law report ("2016 YLR 1229") next to the PHC neutral citation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->string('other_citation', 120)->nullable()->after('citation');
            $table->mediumText('remarks')->nullable()->after('tag_line');
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->dropColumn(['other_citation', 'remarks']);
        });
    }
};
