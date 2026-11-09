<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Calendar entries that have no other home: meetings, reminders, court visits,
 * personal events. Hearings, appointments, tasks and diary notes are NOT copied
 * here; the calendar reads them from their own tables (docs/Modules/Calendar.md).
 *
 * calendar_event_changes keeps every reschedule/cancel/complete with who and when;
 * the event row keeps the first scheduled time in original_starts_at/ends_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('legal_case_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 30)->default('meeting');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->boolean('all_day')->default(false);
            $table->string('visibility', 20)->default('private');
            $table->string('status', 20)->default('scheduled');
            $table->dateTime('original_starts_at')->nullable();
            $table->dateTime('original_ends_at')->nullable();
            $table->string('recurrence', 20)->default('none');
            $table->unsignedTinyInteger('recurrence_interval')->default(1);
            $table->date('recurrence_until')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'starts_at']);
            $table->index(['user_id', 'starts_at']);
            $table->index(['client_id', 'starts_at']);
        });

        Schema::create('calendar_event_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_event_id')->constrained()->cascadeOnDelete();
            $table->string('action', 20);
            $table->dateTime('from_starts_at')->nullable();
            $table->dateTime('from_ends_at')->nullable();
            $table->dateTime('to_starts_at')->nullable();
            $table->dateTime('to_ends_at')->nullable();
            $table->string('reason')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['calendar_event_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_event_changes');
        Schema::dropIfExists('calendar_events');
    }
};
