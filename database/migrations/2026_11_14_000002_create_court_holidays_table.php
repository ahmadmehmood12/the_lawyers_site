<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Court calendar: public holidays and court vacations, set in Admin, Court calendar. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('court_holidays', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_ur')->nullable();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('kind', 30)->default('public_holiday');
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->string('notes', 500)->nullable();
            $table->boolean('tentative')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'starts_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('court_holidays');
    }
};
