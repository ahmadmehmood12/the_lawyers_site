<?php

use App\Enums\PlanFeature as F;
use App\Models\Plan;
use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Plans reduced to Basic (free starter: 2 cases, 2 clients, 3 team members, 500 MB), Professional and
 * Law Firm. Free and Premium are switched off, not deleted: Premium subscribers keep their plan until it
 * ends; organizations on Free move to Basic. New accounts start on Basic (setting default_plan).
 */
return new class extends Migration
{
    public function up(): void
    {
        $basic = Plan::query()->where('slug', 'basic')->first();

        if (! $basic) {
            return; // Fresh install: PlatformContentSeeder creates the plans.
        }

        $basic->forceFill([
            'price_monthly' => 0, 'price_yearly' => 0, 'trial_days' => 0, 'is_active' => true, 'sort_order' => 0,
            'description' => 'For getting started: your court diary with a few cases.',
        ])->save();

        $limits = [F::MaxActiveCases->value => 2, F::MaxClients->value => 2, F::MaxTeamMembers->value => 3, F::StorageMb->value => 500, F::WhatsAppReminders->value => 0, F::AiAssistant->value => 0, F::Analytics->value => 0];
        foreach ($limits as $feature => $limit) {
            $basic->features()->updateOrCreate(['feature' => $feature], ['limit_value' => $limit]);
        }

        Plan::query()->where('slug', 'professional')->update(['sort_order' => 1]);
        Plan::query()->where('slug', 'law-firm')->update(['sort_order' => 2]);

        if ($free = Plan::query()->where('slug', 'free')->first()) {
            DB::table('subscriptions')->where('plan_id', $free->id)->whereIn('status', ['trialing', 'active', 'past_due'])
                ->update(['plan_id' => $basic->id, 'ends_at' => null, 'trial_ends_at' => null, 'updated_at' => now()]);
        }
        Plan::query()->whereIn('slug', ['free', 'premium'])->update(['is_active' => false]);

        if (in_array(Setting::get('default_plan'), [null, 'free', 'premium'], true)) {
            Setting::put('default_plan', 'basic');
        }
    }

    public function down(): void
    {
        Plan::query()->whereIn('slug', ['free', 'premium'])->update(['is_active' => true]);
    }
};
