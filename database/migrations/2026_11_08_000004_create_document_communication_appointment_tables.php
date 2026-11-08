<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Document vault (versioned, private storage, shares, access log), legal
 * drafting (templates, drafts with version history), messaging and
 * appointments. See docs/Modules/Documents.md, Legal-Drafting.md,
 * Communication.md and Appointments.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('hearing_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 30)->default('other');
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('is_confidential')->default(false);
            $table->string('source', 20)->default('lawyer')->comment('lawyer|client|draft');
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['organization_id', 'legal_case_id']);
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('disk', 20)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size');
            $table->char('sha256', 64);
            $table->string('note')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['document_id', 'version']);
        });

        Schema::create('document_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->boolean('can_download')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('shared_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['client_id', 'revoked_at']);
        });

        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->restrictOnDelete();
            $table->foreignId('document_version_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 20);
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['document_id', 'created_at']);
        });

        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->restrictOnDelete()->comment('NULL = platform library');
            $table->string('category', 40)->index();
            $table->string('title');
            $table->string('title_ur')->nullable();
            $table->string('language', 5)->default('en');
            $table->text('description')->nullable();
            $table->longText('body');
            $table->string('review_status', 20)->default('unreviewed')->comment('unreviewed|reviewed');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('document_template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('language', 5)->default('en');
            $table->longText('body');
            $table->string('header_text')->nullable();
            $table->string('footer_text')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('draft_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('draft_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->longText('body');
            $table->string('note')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['draft_id', 'version']);
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->unique(['conversation_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->restrictOnDelete();
            $table->foreignId('sender_id')->constrained('users')->restrictOnDelete();
            $table->text('body')->nullable()->comment('encrypted');
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->string('attachment_mime', 100)->nullable();
            $table->unsignedInteger('attachment_size')->nullable();
            $table->timestamps();
            $table->index(['conversation_id', 'id']);
        });

        Schema::create('availability_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday')->comment('0 = Sunday');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->string('mode', 20)->default('both')->comment('online|in_person|both');
            $table->timestamps();
            $table->index(['user_id', 'weekday']);
        });

        Schema::create('unavailable_dates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('reason')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'date']);
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('lawyer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contact_name');
            $table->string('contact_phone', 20)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('mode', 20)->default('in_person');
            $table->string('kind', 20)->default('consultation');
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('requested')->index();
            $table->decimal('fee', 12, 2)->nullable();
            $table->text('client_message')->nullable();
            $table->text('lawyer_notes')->nullable();
            $table->string('meeting_link')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->foreignId('rescheduled_from_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->timestamps();
            $table->index(['lawyer_id', 'starts_at']);
        });

        Schema::create('favourite_lawyers', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['user_id', 'lawyer_profile_id']);
        });
    }

    public function down(): void
    {
        foreach ([
            'favourite_lawyers', 'appointments', 'unavailable_dates', 'availability_slots',
            'messages', 'conversation_participants', 'conversations',
            'draft_versions', 'drafts', 'document_templates',
            'document_access_logs', 'document_shares', 'document_versions', 'documents',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
