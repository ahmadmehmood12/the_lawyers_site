<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lawyer-to-lawyer messaging (docs/Modules/Communication.md): `kind` = client (org-bound,
 * lawyer and client) or direct (two professionals, possibly from different firms, so
 * organization_id is null).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->change();
            $table->foreign('organization_id')->references('id')->on('organizations')->restrictOnDelete();
            $table->string('kind', 10)->default('client')->after('id');
            $table->index(['kind', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex(['kind', 'last_message_at']);
            $table->dropColumn('kind');
        });
    }
};
