<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user Firebase Cloud Messaging device token for mobile push notifications.
 * One token per user (the latest device that registered); platform records
 * which OS it came from so iOS/Android can be targeted or counted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('fcm_token')->nullable()->after('phone_verified_at');
            $table->string('fcm_platform', 10)->nullable()->after('fcm_token');
            $table->timestamp('fcm_token_updated_at')->nullable()->after('fcm_platform');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['fcm_token', 'fcm_platform', 'fcm_token_updated_at']);
        });
    }
};
