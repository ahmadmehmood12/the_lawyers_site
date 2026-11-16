<?php

use App\Enums\PlanFeature;
use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;

/** Law Firm plan: Rs 10,000 a month (Rs 100,000 a year) with 100 GB storage. */
return new class extends Migration
{
    public function up(): void
    {
        $plan = Plan::query()->where('slug', 'law-firm')->first();

        if (! $plan) {
            return; // Fresh install: PlatformContentSeeder creates it with these values.
        }

        $plan->forceFill(['price_monthly' => 10000, 'price_yearly' => 100000])->save();
        $plan->features()->updateOrCreate(['feature' => PlanFeature::StorageMb->value], ['limit_value' => 100000]);
    }

    public function down(): void
    {
        $plan = Plan::query()->where('slug', 'law-firm')->first();
        $plan?->forceFill(['price_monthly' => 15000, 'price_yearly' => 150000])->save();
        $plan?->features()->updateOrCreate(['feature' => PlanFeature::StorageMb->value], ['limit_value' => 200000]);
    }
};
