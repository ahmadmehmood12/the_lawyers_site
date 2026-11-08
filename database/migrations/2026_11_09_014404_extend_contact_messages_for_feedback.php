<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Turns contact_messages into one inbox for public "Contact us" messages and
 * signed-in feedback (clients, lawyers, firms, staff). Only platform admins
 * with support.manage read it (docs/Modules/Feedback.md).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->string('reference', 20)->nullable()->unique()->after('id');
            $table->string('kind', 20)->default('contact')->after('reference');
            $table->foreignId('user_id')->nullable()->after('kind')->constrained()->nullOnDelete();
            $table->string('account_type', 20)->nullable()->after('user_id');
            $table->string('category', 30)->nullable()->after('subject');
            $table->string('status', 20)->default('new')->after('body');
            $table->text('admin_note')->nullable()->after('status');
            $table->foreignId('handled_by')->nullable()->after('admin_note')->constrained('users')->nullOnDelete();
            $table->boolean('whatsapp_consent')->default(false)->after('phone');
            $table->string('locale', 5)->default('en')->after('whatsapp_consent');
            $table->index(['kind', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropIndex(['kind', 'status', 'created_at']);
            $table->dropConstrainedForeignId('handled_by');
            $table->dropConstrainedForeignId('user_id');
            $table->dropUnique(['reference']);
            $table->dropColumn(['reference', 'kind', 'account_type', 'category', 'status', 'admin_note', 'whatsapp_consent', 'locale']);
        });
    }
};
