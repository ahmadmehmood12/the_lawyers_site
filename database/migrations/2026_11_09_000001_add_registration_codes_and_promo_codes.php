<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('referral_code', 40)->nullable()->after('theme');
            $table->string('coupon_code', 40)->nullable()->after('referral_code');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->string('invite_code', 20)->nullable()->unique()->after('registration_number');
        });

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('type', 20)->default('referral')->index()->comment('referral|coupon');
            $table->string('description')->nullable();
            $table->unsignedTinyInteger('discount_percent')->default(0);
            $table->unsignedSmallInteger('bonus_trial_days')->default(0);
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropUnique(['invite_code']);
            $table->dropColumn('invite_code');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['referral_code', 'coupon_code']);
        });
    }
};
