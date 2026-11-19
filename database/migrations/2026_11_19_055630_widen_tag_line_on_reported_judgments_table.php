<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Court tag lines can be long (some LHC tag lines run to several paragraphs): no length limit. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->mediumText('tag_line')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reported_judgments', function (Blueprint $table) {
            $table->text('tag_line')->nullable()->change();
        });
    }
};
