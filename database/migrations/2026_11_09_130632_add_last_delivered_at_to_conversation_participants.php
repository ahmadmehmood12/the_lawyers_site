<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Delivery receipts: set when the participant signs in or loads any page after a message
 * arrived (single tick = sent, double grey = delivered, double blue = read via last_read_at).
 * See docs/Modules/Communication.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->timestamp('last_delivered_at')->nullable()->after('last_read_at');
        });
    }

    public function down(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->dropColumn('last_delivered_at');
        });
    }
};
