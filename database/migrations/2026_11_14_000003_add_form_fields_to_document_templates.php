<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Legal forms (Wakalatnama, Power of Attorney): a template with `kind` = form and a list of
 * fields the lawyer fills in; the body uses {{form.key}} for each field (docs/Modules/Legal-Drafting.md).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            $table->string('kind', 20)->default('draft')->after('category');
            $table->json('fields')->nullable()->after('body');
            $table->index(['kind', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            $table->dropIndex(['kind', 'is_active']);
            $table->dropColumn(['kind', 'fields']);
        });
    }
};
