<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Six-digit codes for email verification and password reset (docs/Modules/Authentication.md).
 * Only a hash of the code is stored; one live code per email and purpose.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('one_time_codes', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('purpose', 30);
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique(['email', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('one_time_codes');
    }
};
