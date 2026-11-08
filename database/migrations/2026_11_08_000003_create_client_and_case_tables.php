<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Clients, cases and everything hanging off a case: parties, lawyers,
 * hearings (append-only history), diary, tasks, expenses and the timeline.
 * See docs/Modules/Clients.md, Cases.md, Hearings.md and Court-Diary.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->comment('Portal account');
            $table->string('type', 20)->default('individual');
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->text('cnic')->nullable()->comment('encrypted');
            $table->string('ntn', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('address')->nullable();
            $table->foreignId('city_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('preferred_locale', 5)->default('en');
            $table->text('notes')->nullable()->comment('encrypted, internal only');
            $table->timestamp('whatsapp_consent_at')->nullable();
            $table->timestamp('whatsapp_consent_revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['organization_id', 'name']);
            $table->index(['organization_id', 'phone']);
        });

        Schema::create('legal_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->string('reference', 30)->comment('Internal file number, unique per organization');
            $table->string('title');
            $table->string('case_number', 100)->nullable()->comment('Court-assigned number');
            $table->string('case_type', 30)->index();
            $table->foreignId('specialization_id')->nullable()->constrained()->restrictOnDelete();
            $table->text('description')->nullable();
            $table->date('filing_date')->nullable();
            $table->unsignedSmallInteger('filing_year')->nullable();
            $table->foreignId('court_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('jurisdiction', 30)->nullable();
            $table->foreignId('province_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('district_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('judge_id')->nullable()->constrained()->nullOnDelete();
            $table->string('judge_name')->nullable();
            $table->string('courtroom', 50)->nullable();
            $table->string('status', 30)->default('draft')->index();
            $table->string('stage')->nullable();
            $table->string('priority', 10)->default('normal');
            $table->decimal('professional_fee', 14, 2)->nullable();
            $table->string('fee_type', 20)->nullable();
            $table->string('fir_number', 60)->nullable();
            $table->string('police_station')->nullable();
            $table->date('fir_date')->nullable();
            $table->string('legal_sections')->nullable();
            $table->string('bail_status', 30)->nullable();
            $table->text('investigation_notes')->nullable()->comment('encrypted, internal');
            $table->text('strategy_notes')->nullable()->comment('encrypted, internal');
            $table->text('client_summary')->nullable()->comment('Lawyer-curated progress shown to clients');
            $table->boolean('share_with_client')->default(true);
            $table->unsignedBigInteger('next_hearing_id')->nullable()->index();
            $table->timestamp('next_hearing_at')->nullable()->index();
            $table->date('decided_on')->nullable();
            $table->string('outcome', 30)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['organization_id', 'reference']);
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'court_id']);
        });

        Schema::create('case_parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20);
            $table->string('name');
            $table->string('father_name')->nullable();
            $table->text('cnic')->nullable()->comment('encrypted');
            $table->string('address')->nullable();
            $table->string('counsel_name')->nullable();
            $table->boolean('is_our_side')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('case_lawyer', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 20)->default('assisting');
            $table->timestamps();
            $table->unique(['legal_case_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('case_client', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['legal_case_id', 'client_id']);
        });

        Schema::create('related_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_case_id')->constrained('legal_cases')->cascadeOnDelete();
            $table->string('relation', 30)->default('related');
            $table->timestamps();
            $table->unique(['legal_case_id', 'related_case_id']);
        });

        Schema::create('hearings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->constrained()->restrictOnDelete();
            $table->foreignId('court_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('judge_id')->nullable()->constrained()->nullOnDelete();
            $table->string('judge_name')->nullable();
            $table->string('courtroom', 50)->nullable();
            $table->date('hearing_date')->index();
            $table->time('hearing_time')->nullable();
            $table->string('hearing_type', 30)->default('regular');
            $table->string('purpose')->nullable();
            $table->foreignId('assigned_lawyer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('preparation_notes')->nullable();
            $table->string('status', 20)->default('scheduled')->index();
            $table->foreignId('previous_hearing_id')->nullable()->constrained('hearings')->nullOnDelete();
            $table->foreignId('rescheduled_to_id')->nullable()->constrained('hearings')->nullOnDelete();
            $table->string('reschedule_reason')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->boolean('visible_to_client')->default(true);
            // Outcome — recorded once after the hearing; corrections are audited.
            $table->date('held_on')->nullable();
            $table->string('lawyer_attendance', 20)->nullable();
            $table->string('client_attendance', 20)->nullable();
            $table->string('opposing_counsel_attendance', 20)->nullable();
            $table->text('proceedings')->nullable();
            $table->text('arguments')->nullable();
            $table->text('evidence')->nullable();
            $table->text('documents_submitted')->nullable();
            $table->text('order_passed')->nullable();
            $table->string('adjournment_reason')->nullable();
            $table->date('next_hearing_date')->nullable();
            $table->string('next_hearing_purpose')->nullable();
            $table->text('internal_notes')->nullable()->comment('encrypted, never shown to clients');
            $table->text('client_note')->nullable()->comment('Client-facing summary');
            $table->foreignId('outcome_recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('outcome_recorded_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['organization_id', 'hearing_date']);
            $table->index(['assigned_lawyer_id', 'hearing_date']);
        });

        Schema::create('diary_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('hearing_id')->nullable()->constrained()->nullOnDelete();
            $table->date('entry_date');
            $table->time('entry_time')->nullable();
            $table->string('title');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'entry_date']);
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('hearing_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable()->index();
            $table->string('priority', 10)->default('normal');
            $table->string('status', 20)->default('open')->index();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['organization_id', 'status', 'due_date']);
        });

        Schema::create('case_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legal_case_id')->constrained()->restrictOnDelete();
            $table->string('category', 30)->default('court_fee');
            $table->string('description');
            $table->decimal('amount', 14, 2);
            $table->date('incurred_on');
            $table->boolean('is_billable')->default(true);
            $table->unsignedBigInteger('invoice_item_id')->nullable()->index();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('case_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40);
            $table->string('title');
            $table->text('description')->nullable();
            $table->nullableMorphs('subject');
            $table->boolean('visible_to_client')->default(false);
            $table->timestamp('occurred_at')->index();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['case_events', 'case_expenses', 'tasks', 'diary_entries', 'hearings', 'related_cases', 'case_client', 'case_lawyer', 'case_parties', 'legal_cases', 'clients'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
