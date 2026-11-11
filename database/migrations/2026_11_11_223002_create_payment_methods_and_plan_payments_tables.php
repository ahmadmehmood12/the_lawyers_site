<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How organizations pay for plans: configurable payment methods (Stripe,
 * manual bank transfer, wallets such as SadaPay/NayaPay) and the payment
 * requests themselves. Manual requests stay pending until an admin verifies
 * the uploaded screenshot; Stripe requests are fulfilled by a signed webhook.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('key', 40)->unique();
            $table->string('name', 120);
            $table->string('kind', 20)->default('manual')->comment('stripe|manual');
            $table->boolean('is_enabled')->default(false)->index();
            $table->text('instructions')->nullable();
            $table->json('details')->nullable()->comment('Label/value rows such as bank name, account title, IBAN');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('plan_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('billing_cycle', 10)->default('monthly');
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3)->default('PKR');
            $table->string('status', 30)->default('pending')->index();
            $table->string('account_email');
            $table->string('reference', 120)->nullable();
            $table->string('screenshot_path')->nullable();
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->string('provider', 30)->nullable();
            $table->string('provider_reference', 191)->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_payments');
        Schema::dropIfExists('payment_methods');
    }
};
