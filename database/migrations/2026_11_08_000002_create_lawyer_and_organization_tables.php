<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lawyer profiles, qualifications, verification workflow, and organizations
 * (solo practices and law firms) with memberships. See docs/Modules/Lawyers.md,
 * docs/Modules/Lawyer-Verification.md and docs/Modules/Law-Firms.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lawyer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('slug')->unique();
            $table->string('title', 30)->nullable();
            $table->text('cnic')->nullable()->comment('encrypted');
            $table->foreignId('bar_council_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('enrollment_number', 60)->nullable();
            $table->string('advocate_category', 30)->nullable()->index();
            $table->date('enrollment_date')->nullable();
            $table->unsignedSmallInteger('practice_since')->nullable();
            $table->string('headline')->nullable();
            $table->text('bio')->nullable();
            $table->text('bio_ur')->nullable();
            $table->string('photo_path')->nullable();
            $table->foreignId('province_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('district_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('chamber_address')->nullable();
            $table->string('public_phone', 20)->nullable();
            $table->string('public_email')->nullable();
            $table->unsignedInteger('consultation_fee_min')->nullable();
            $table->unsignedInteger('consultation_fee_max')->nullable();
            $table->boolean('offers_online')->default(false);
            $table->boolean('offers_in_person')->default(true);
            $table->boolean('accepting_clients')->default(true)->index();
            $table->boolean('is_public')->default(false)->index();
            $table->string('verification_status', 30)->default('unverified')->index();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedTinyInteger('onboarding_step')->default(1);
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->timestamps();
            $table->unique(['bar_council_id', 'enrollment_number']);
            $table->index(['is_public', 'verification_status', 'city_id']);
        });

        Schema::create('lawyer_specialization', function (Blueprint $table) {
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specialization_id')->constrained()->restrictOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->primary(['lawyer_profile_id', 'specialization_id']);
        });

        Schema::create('court_lawyer_profile', function (Blueprint $table) {
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('court_id')->constrained()->restrictOnDelete();
            $table->primary(['lawyer_profile_id', 'court_id']);
        });

        Schema::create('lawyer_languages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('language', 30);
            $table->unique(['lawyer_profile_id', 'language']);
            $table->index('language');
        });

        Schema::create('lawyer_educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('degree');
            $table->string('institution');
            $table->unsignedSmallInteger('year')->nullable();
            $table->timestamps();
        });

        Schema::create('lawyer_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('position');
            $table->string('organization');
            $table->unsignedSmallInteger('start_year')->nullable();
            $table->unsignedSmallInteger('end_year')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('lawyer_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lawyer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->comment('publication|certification|award');
            $table->string('title');
            $table->string('issuer')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('url')->nullable();
            $table->timestamps();
        });

        Schema::create('verification_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lawyer_profile_id')->constrained()->restrictOnDelete();
            $table->string('status', 30)->default('unverified')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->text('information_requested')->nullable();
            $table->timestamps();
        });

        Schema::create('verification_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('verification_request_id')->constrained()->restrictOnDelete();
            $table->string('type', 40);
            $table->string('disk', 20)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 100);
            $table->unsignedInteger('size');
            $table->timestamps();
        });

        Schema::create('verification_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('verification_request_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10)->comment('solo|firm');
            $table->string('name');
            $table->string('slug')->unique();
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->text('description')->nullable();
            $table->text('description_ur')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('website')->nullable();
            $table->string('address')->nullable();
            $table->foreignId('city_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('registration_number', 60)->nullable();
            $table->string('ntn', 30)->nullable();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->boolean('is_public')->default(false)->index();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('organization_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 30);
            $table->string('status', 20)->default('active')->index();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->unique(['organization_id', 'user_id']);
        });

        Schema::create('organization_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('role', 30);
            $table->string('token_hash', 64)->unique();
            $table->foreignId('invited_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'email']);
        });
    }

    public function down(): void
    {
        foreach ([
            'organization_invitations', 'organization_members', 'organizations',
            'verification_events', 'verification_documents', 'verification_requests',
            'lawyer_credentials', 'lawyer_experiences', 'lawyer_educations', 'lawyer_languages',
            'court_lawyer_profile', 'lawyer_specialization', 'lawyer_profiles',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
