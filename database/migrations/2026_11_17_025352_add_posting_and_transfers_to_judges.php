<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Where a judge is posted (court, district, tehsil) and the history of transfers and swaps
 * (Admin, Reference data, Judges: Transfer / Swap two judges).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('judges', function (Blueprint $table) {
            $table->foreignId('district_id')->nullable()->after('court_id')->constrained()->nullOnDelete();
            $table->foreignId('tehsil_id')->nullable()->after('district_id')->constrained()->nullOnDelete();
            $table->date('posted_on')->nullable()->after('courtroom');
        });

        // Postings start in the court's district.
        DB::table('judges')->join('courts', 'courts.id', '=', 'judges.court_id')->whereNull('judges.district_id')
            ->update(['judges.district_id' => DB::raw('courts.district_id')]);

        Schema::create('judge_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('judge_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10)->default('transfer'); // transfer | swap
            $table->foreignId('swapped_with_id')->nullable()->constrained('judges')->nullOnDelete();
            $table->foreignId('from_court_id')->nullable()->constrained('courts')->nullOnDelete();
            $table->foreignId('from_district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('from_tehsil_id')->nullable()->constrained('tehsils')->nullOnDelete();
            $table->string('from_courtroom', 50)->nullable();
            $table->foreignId('to_court_id')->nullable()->constrained('courts')->nullOnDelete();
            $table->foreignId('to_district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('to_tehsil_id')->nullable()->constrained('tehsils')->nullOnDelete();
            $table->string('to_courtroom', 50)->nullable();
            $table->date('effective_on');
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['judge_id', 'effective_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('judge_transfers');
        Schema::table('judges', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tehsil_id');
            $table->dropConstrainedForeignId('district_id');
            $table->dropColumn('posted_on');
        });
    }
};
