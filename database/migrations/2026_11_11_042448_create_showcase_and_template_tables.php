<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Public showcase managed in Admin (docs/Modules/Showcase.md) and editable email templates
 * (docs/Features/Email-Templates.md).
 *
 * - testimonials: platform client testimonials, text or video (one table, `kind`). Different from
 *   `reviews`, which are moderated reviews of a specific lawyer.
 * - team_designations / team_members: founders, patrons, advisers and team on the homepage.
 * - email_templates: per-event subject/heading/body overrides for branded notification emails.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 10)->default('text');
            $table->string('name');
            $table->string('designation')->nullable();
            $table->text('body')->nullable();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('video_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->boolean('is_verified_client')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['kind', 'is_active', 'sort_order']);
        });

        Schema::create('team_designations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ur')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_designation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('photo_path')->nullable();
            $table->text('bio')->nullable();
            $table->string('qualifications')->nullable();
            $table->string('experience')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('profile_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60);
            $table->string('language', 5)->default('en');
            $table->string('subject');
            $table->string('heading')->nullable();
            $table->text('intro')->nullable();
            $table->text('outro')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['key', 'language']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('team_designations');
        Schema::dropIfExists('testimonials');
    }
};
