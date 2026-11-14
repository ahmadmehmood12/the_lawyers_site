<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * WhatsApp consent with timestamp and source for account holders (users) and client records, and the
 * provider that sent each delivery (meta or green_api). See docs/Features/WhatsApp.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('whatsapp_consent_at')->nullable()->after('phone');
            $table->timestamp('whatsapp_consent_revoked_at')->nullable()->after('whatsapp_consent_at');
            $table->string('whatsapp_consent_source', 40)->nullable()->after('whatsapp_consent_revoked_at');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('whatsapp_consent_source', 40)->nullable()->after('whatsapp_consent_revoked_at');
        });

        Schema::table('notification_deliveries', function (Blueprint $table) {
            $table->string('provider', 20)->nullable()->after('channel');
        });

        // Users who already switched WhatsApp on for an event did so explicitly: keep that opt in.
        DB::table('notification_preferences')->where('channel', 'whatsapp')->where('enabled', true)
            ->selectRaw('user_id, MIN(updated_at) as at')->groupBy('user_id')->get()
            ->each(fn ($row) => DB::table('users')->where('id', $row->user_id)->whereNull('whatsapp_consent_at')
                ->update(['whatsapp_consent_at' => $row->at, 'whatsapp_consent_source' => 'notification_preferences']));

        DB::table('clients')->whereNotNull('whatsapp_consent_at')->whereNull('whatsapp_consent_source')
            ->update(['whatsapp_consent_source' => 'recorded_by_lawyer']);
    }

    public function down(): void
    {
        Schema::table('notification_deliveries', fn (Blueprint $table) => $table->dropColumn('provider'));
        Schema::table('clients', fn (Blueprint $table) => $table->dropColumn('whatsapp_consent_source'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['whatsapp_consent_at', 'whatsapp_consent_revoked_at', 'whatsapp_consent_source']));
    }
};
