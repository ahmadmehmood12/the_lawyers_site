<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Administrable reference data: geography, court hierarchy, judges,
 * legal specializations and bar councils. See docs/Modules/Courts.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('code', 10)->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->timestamps();
            $table->unique(['province_id', 'name']);
        });

        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('court_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('slug')->unique();
            $table->unsignedTinyInteger('level')->default(5)->comment('1 = apex; higher = subordinate');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('courts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('court_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('courts')->nullOnDelete()->comment('Principal seat for benches/branches');
            $table->foreignId('province_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('district_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('slug')->unique();
            $table->string('bench')->nullable();
            $table->string('address')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['district_id', 'court_type_id']);
        });

        Schema::create('judges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('court_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('designation')->nullable();
            $table->string('courtroom', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('specializations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('description_ur')->nullable();
            $table->string('icon', 40)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('bar_councils', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->string('code', 20)->unique();
            $table->foreignId('province_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['bar_councils', 'specializations', 'judges', 'courts', 'court_types', 'cities', 'districts', 'provinces'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
