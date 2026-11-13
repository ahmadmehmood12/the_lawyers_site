<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\AccountType;
use App\Enums\CaseStatus;
use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\ClientRequest;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use App\Notifications\ClientPortalInvitation;
use App\Services\Subscriptions\SubscriptionService;
use App\Support\PublicFile;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Client::class);
        [$sort, $direction] = $this->sorting(['name', 'created_at'], 'name', 'asc');

        $clients = $this->organization()->clients()
            ->withCount('cases')
            ->with(['city:id,name', 'user:id,avatar_path'])
            ->when($request->string('search')->trim()->toString(), function ($q, string $search): void {
                $q->where(fn ($w) => $w->where('name', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->orderBy($sort, $direction)->orderBy('id')
            ->paginate(20)->withQueryString()
            ->through(fn (Client $c) => [
                'id' => $c->id, 'name' => $c->name, 'type' => $c->type, 'company_name' => $c->company_name,
                'phone' => $c->phone, 'email' => $c->email, 'city' => $c->city?->name, 'cases_count' => $c->cases_count,
                'has_portal' => $c->user_id !== null,
                'avatar_url' => PublicFile::url($c->user?->avatar_path),
            ]);

        $all = $this->organization()->clients();
        $openStatuses = CaseStatus::openValues();

        return Inertia::render('Workspace/Clients/Index', [
            'clients' => $clients,
            'kpis' => [
                'total' => (clone $all)->count(),
                'individual' => (clone $all)->where('type', 'individual')->count(),
                'business' => (clone $all)->where('type', 'business')->count(),
                'portal' => (clone $all)->whereNotNull('user_id')->count(),
                'active' => (clone $all)->whereHas('cases', fn ($q) => $q->whereIn('status', $openStatuses))->count(),
                'new_this_month' => (clone $all)->where('created_at', '>=', now()->startOfMonth())->count(),
            ],
            'filters' => $request->only(['search', 'type', 'sort', 'direction']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Client::class);

        return Inertia::render('Workspace/Clients/Form', ['client' => null, 'cities' => ReferenceOptions::cities()]);
    }

    public function store(ClientRequest $request, SubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorize('create', Client::class);
        $organization = $this->organization();

        $subscriptions->ensureCanAdd($organization, PlanFeature::MaxClients);

        $client = $organization->clients()->create([...$request->clientData(), 'created_by' => $request->user()->id]);
        $this->applyConsent($client, $request->boolean('whatsapp_consent'));

        return redirect()->route('clients.show', $client)->with('success', __('Client added.'));
    }

    public function show(Request $request, Client $client): Response
    {
        $this->authorize('view', $client);
        $user = $request->user();
        $canSensitive = $user->can('viewSensitive', $client);

        $client->load(['city:id,name', 'cases' => fn ($q) => $q->visibleTo($user, $this->organization())->with('court:id,name')->latest('id')]);

        return Inertia::render('Workspace/Clients/Show', [
            'client' => [
                ...$client->only(['id', 'type', 'name', 'company_name', 'ntn', 'email', 'phone', 'whatsapp', 'address', 'preferred_locale', 'user_id']),
                'city' => $client->city?->name,
                'cnic' => $canSensitive ? $client->cnic : $client->maskedCnic(),
                'notes' => $canSensitive ? $client->notes : null,
                'whatsapp_consent' => $client->hasWhatsAppConsent(),
                'whatsapp_consent_at' => $client->whatsapp_consent_at?->toIso8601String(),
                'created_at' => $client->created_at->toIso8601String(),
            ],
            'cases' => $client->cases->map(fn ($c) => [
                'id' => $c->id, 'reference' => $c->reference, 'title' => $c->title, 'status' => $c->status->value, 'status_label' => $c->status->label(),
                'court' => $c->court?->name, 'next_hearing_at' => $c->next_hearing_at?->toIso8601String(),
            ]),
            'invoices' => $user->can('viewAny', Invoice::class)
                ? $client->invoices()->latest('issue_date')->limit(10)->get(['id', 'number', 'issue_date', 'total', 'amount_paid', 'status'])->map(fn ($i) => [...$i->toArray(), 'status_label' => $i->status->label()])
                : null,
            'appointments' => $client->appointments()->latest('starts_at')->limit(10)->get(['id', 'starts_at', 'status', 'mode'])->map(fn ($a) => ['id' => $a->id, 'starts_at' => $a->starts_at->toIso8601String(), 'status' => $a->status->value, 'status_label' => $a->status->label()]),
            'can' => ['update' => $user->can('update', $client), 'delete' => $user->can('delete', $client), 'sensitive' => $canSensitive],
        ]);
    }

    public function edit(Request $request, Client $client): Response
    {
        $this->authorize('update', $client);

        return Inertia::render('Workspace/Clients/Form', [
            'client' => [
                ...$client->only(['id', 'type', 'name', 'company_name', 'ntn', 'email', 'phone', 'whatsapp', 'address', 'city_id', 'preferred_locale']),
                'cnic' => $request->user()->can('viewSensitive', $client) ? $client->cnic : null,
                'notes' => $request->user()->can('viewSensitive', $client) ? $client->notes : null,
                'whatsapp_consent' => $client->hasWhatsAppConsent(),
            ],
            'cities' => ReferenceOptions::cities(),
        ]);
    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        $this->authorize('update', $client);
        $data = $request->clientData();

        if (! $request->user()->can('viewSensitive', $client)) {
            unset($data['cnic'], $data['notes']);
        }

        $client->update($data);
        $this->applyConsent($client, $request->boolean('whatsapp_consent'));

        return redirect()->route('clients.show', $client)->with('success', __('Client updated.'));
    }

    public function destroy(Client $client): RedirectResponse
    {
        $this->authorize('delete', $client);

        if ($client->cases()->exists() || $client->invoices()->exists()) {
            return back()->with('error', __('Clients with cases or invoices cannot be deleted. Archive their cases instead.'));
        }

        $client->delete();

        return redirect()->route('clients.index')->with('success', __('Client removed.'));
    }

    /** Records WhatsApp opt-in/out with timestamps (consent is required before any WhatsApp message). */
    private function applyConsent(Client $client, bool $consent): void
    {
        if ($consent && ! $client->hasWhatsAppConsent()) {
            $client->forceFill(['whatsapp_consent_at' => now(), 'whatsapp_consent_revoked_at' => null])->save();
        } elseif (! $consent && $client->hasWhatsAppConsent()) {
            $client->forceFill(['whatsapp_consent_revoked_at' => now()])->save();
        }
    }

    /**
     * Invite the client to the portal. A new email gets a client account and a signed link (7 days)
     * to choose a password; an existing client account is linked and gets a sign in link.
     */
    public function invitePortal(Request $request, Client $client): RedirectResponse
    {
        $this->authorize('update', $client);

        if (blank($client->email)) {
            return back()->with('error', __('Add the client’s email address first.'));
        }

        $email = strtolower(trim($client->email));
        $existing = User::query()->where('email', $email)->first();

        if ($existing && $existing->account_type !== AccountType::Client) {
            return back()->with('error', __('This email belongs to a lawyer or staff account, so it cannot be used for the client portal.'));
        }

        $user = $existing ?? User::query()->forceCreate([
            'name' => $client->name, 'email' => $email, 'phone' => $client->phone,
            'password' => Str::password(32), 'account_type' => AccountType::Client,
            'locale' => $client->preferred_locale ?: 'en',
        ]);

        $client->forceFill(['user_id' => $user->id])->save();

        $new = ! $existing || $user->email_verified_at === null;
        $url = $new
            ? URL::temporarySignedRoute('portal.invitation.show', now()->addDays(7), ['user' => $user->id])
            : route('login');

        $user->notify((new ClientPortalInvitation($client->loadMissing('organization'), $url, $new, $request->user()->name))->locale($user->locale ?: 'en'));

        return back()->with('success', __('Portal invitation sent to :email', ['email' => $email]));
    }
}
