<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Plan;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Platform view of organizations: counts and subscription only — never case content. */
class OrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $organizations = Organization::query()->with(['owner:id,name,email', 'activeSubscription.plan:id,name'])->withCount(['activeMembers', 'cases', 'clients'])
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->string('type')->toString(), fn ($q, $t) => $q->where('type', $t))
            ->latest()->paginate(25)->withQueryString()
            ->through(fn (Organization $o) => [
                'id' => $o->id, 'name' => $o->name, 'type' => $o->type->value, 'type_label' => $o->type->label(), 'status' => $o->status,
                'owner' => $o->owner->name, 'owner_email' => $o->owner->email, 'members' => $o->active_members_count, 'cases' => $o->cases_count, 'clients' => $o->clients_count,
                'plan' => $o->activeSubscription?->plan?->name, 'plan_ends_at' => $o->activeSubscription?->ends_at?->toDateString(), 'created_at' => $o->created_at->toDateString(),
            ]);

        return Inertia::render('Admin/Organizations', [
            'organizations' => $organizations,
            'filters' => $request->only(['search', 'type']),
            'plans' => Plan::query()->orderBy('sort_order')->get(['id', 'slug', 'name'])->map(fn ($p) => ['value' => $p->slug, 'label' => $p->name]),
            'canManage' => $request->user()->can('billing.manage') || $request->user()->isSuperAdmin(),
        ]);
    }

    public function updatePlan(Request $request, Organization $organization, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($request->user()->can('billing.manage') || $request->user()->isSuperAdmin(), 403);
        $validated = $request->validate(['plan' => ['required', 'exists:plans,slug'], 'cycle' => ['required', Rule::in(['monthly', 'yearly'])]]);
        $subscriptions->start($organization, Plan::query()->where('slug', $validated['plan'])->firstOrFail(), $validated['cycle']);
        activity('billing')->causedBy($request->user())->performedOn($organization)->withProperties($validated)->log('plan_assigned');

        return back()->with('success', __('Plan updated.'));
    }

    public function updateStatus(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($request->user()->can('organizations.manage') || $request->user()->isSuperAdmin(), 403);
        $validated = $request->validate(['status' => ['required', Rule::in(['active', 'suspended'])], 'is_public' => ['boolean']]);
        $organization->update($validated);
        activity('admin')->causedBy($request->user())->performedOn($organization)->withProperties($validated)->log('organization_status_changed');

        return back()->with('success', __('Organization updated.'));
    }
}
