<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\MessagingService;
use App\Support\PublicFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Messaging UI for both the workspace (`messages.*`) and the client portal
 * (`portal.messages.*`). Access = participation (ConversationPolicy).
 * Message bodies are encrypted at rest, so search covers subject and names only.
 */
class ConversationController extends Controller
{
    private function portal(Request $request): bool
    {
        return $request->user()->isClient();
    }

    private function prefix(Request $request): string
    {
        return $this->portal($request) ? 'portal.messages' : 'messages';
    }

    public function index(Request $request, MessagingService $messaging): Response
    {
        return $this->render($request, $messaging, null);
    }

    public function show(Request $request, Conversation $conversation, MessagingService $messaging): Response
    {
        $this->authorize('participate', $conversation);
        $messaging->markRead($conversation, $request->user());

        return $this->render($request, $messaging, $conversation);
    }

    private function render(Request $request, MessagingService $messaging, ?Conversation $active): Response
    {
        $user = $request->user();
        $archived = $request->boolean('archived');
        $search = $request->string('search')->trim()->toString();

        $conversations = Conversation::query()->forParticipant($user)
            ->when(! $this->portal($request), fn ($q) => $q->where(fn ($w) => $w->where('organization_id', $this->organization()->id)->orWhere('kind', 'direct')))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->when($archived, fn ($w) => $w->whereNotNull('archived_at'), fn ($w) => $w->whereNull('archived_at')))
            ->when($search, fn ($q) => $q->where(fn ($w) => $w->where('subject', 'like', "%{$search}%")->orWhereHas('users', fn ($u) => $u->where('name', 'like', "%{$search}%"))))
            ->with(['users:id,name,avatar_path', 'participants', 'organization:id,name', 'latestMessage'])
            ->orderByDesc('last_message_at')->orderByDesc('id')->limit(100)->get();

        return Inertia::render('Shared/Messages', [
            'area' => $this->portal($request) ? 'portal' : 'workspace',
            'routePrefix' => $this->prefix($request),
            'conversations' => $conversations->map(fn (Conversation $c) => [
                'id' => $c->id,
                'subject' => $c->subject,
                'with' => $c->users->where('id', '!=', $user->id)->pluck('name')->implode(', '),
                'with_avatar' => PublicFile::url($c->users->firstWhere('id', '!=', $user->id)?->avatar_path),
                'organization' => $c->organization?->name,
                'kind' => $c->kind,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
                'preview' => $c->latestMessage ? ($c->latestMessage->body ? str($c->latestMessage->body)->limit(60)->toString() : '📎 '.$c->latestMessage->attachment_name) : null,
                'unread' => $messaging->unreadCount($c, $user),
            ]),
            'me' => ['id' => $user->id, 'name' => $user->name, 'avatar' => PublicFile::url($user->avatar_path)],
            'active' => $active ? [
                'id' => $active->id,
                'subject' => $active->subject,
                'with' => $active->users()->where('users.id', '!=', $user->id)->pluck('name')->implode(', '),
                'with_avatar' => PublicFile::url($active->users()->where('users.id', '!=', $user->id)->value('avatar_path')),
                'kind' => $active->kind,
                'case' => ! $this->portal($request) && $active->legalCase ? ['id' => $active->legalCase->id, 'title' => $active->legalCase->title] : null,
                'archived' => (bool) $active->participants()->where('user_id', $user->id)->value('archived_at'),
                'messages' => $active->messages()->with('sender:id,name,avatar_path')->latest('id')->limit(100)->get()->reverse()->values()->map(fn (Message $m) => [
                    'id' => $m->id, 'body' => $m->body, 'mine' => $m->sender_id === $user->id, 'sender' => $m->sender->name,
                    'sender_id' => $m->sender_id, 'sender_avatar' => PublicFile::url($m->sender->avatar_path),
                    // Single tick = sent, grey double = delivered, blue double = read (mine only).
                    'status' => $m->sender_id === $user->id ? $messaging->statusFor($m, $active->loadMissing('participants'), $user) : null,
                    'attachment' => $m->attachment_path ? ['name' => $m->attachment_name, 'size' => $m->attachment_size, 'url' => route($this->prefix($request).'.attachment', [$active->id, $m->id])] : null,
                    'created_at' => $m->created_at->toIso8601String(),
                ]),
            ] : null,
            'starters' => $this->portal($request) ? $this->clientStarters($user) : null,
            'clients' => ! $this->portal($request) ? Client::query()->forOrganization($this->organization())->whereNotNull('user_id')->orderBy('name')->get(['id', 'name'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->name]) : null,
            'filters' => ['archived' => $archived, 'search' => $search],
        ]);
    }

    public function store(Request $request, MessagingService $messaging): RedirectResponse
    {
        $user = $request->user();

        if ($this->portal($request)) {
            $validated = $request->validate(['client_id' => ['required', 'integer'], 'lawyer_id' => ['required', 'integer'], 'subject' => ['nullable', 'string', 'max:160']]);
            $client = Client::query()->where('user_id', $user->id)->findOrFail($validated['client_id']);
            $conversation = $messaging->startFromClient($user, User::findOrFail($validated['lawyer_id']), $client, $validated['subject'] ?? null);
        } else {
            $validated = $request->validate(['client_id' => ['required', 'integer'], 'legal_case_id' => ['nullable', 'integer'], 'subject' => ['nullable', 'string', 'max:160']]);
            $client = Client::query()->forOrganization($this->organization())->findOrFail($validated['client_id']);
            $case = isset($validated['legal_case_id']) ? LegalCase::query()->forOrganization($this->organization())->findOrFail($validated['legal_case_id']) : null;
            if ($case) {
                $this->authorize('view', $case);
            }
            $conversation = $messaging->startFromProfessional($user, $client, $case, $validated['subject'] ?? null);
        }

        return redirect()->route($this->prefix($request).'.show', $conversation);
    }

    public function send(Request $request, Conversation $conversation, MessagingService $messaging): RedirectResponse
    {
        $this->authorize('participate', $conversation);
        $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,docx', 'max:10240'],
        ]);

        $messaging->send($conversation, $request->user(), $request->input('body'), $request->file('attachment'));

        return back();
    }

    /** "Mark as read" from the conversation list. */
    public function markRead(Request $request, Conversation $conversation, MessagingService $messaging): RedirectResponse
    {
        $this->authorize('participate', $conversation);
        $messaging->markRead($conversation, $request->user());

        return back();
    }

    /** "Mark all as read" for every conversation the user is in (scoped to the current organization in the workspace). */
    public function markAllRead(Request $request, MessagingService $messaging): RedirectResponse
    {
        $user = $request->user();
        Conversation::query()->forParticipant($user)
            ->when(! $this->portal($request), fn ($q) => $q->where(fn ($w) => $w->where('organization_id', $this->organization()->id)->orWhere('kind', 'direct')))
            ->get()->each(fn (Conversation $c) => $messaging->markRead($c, $user));

        return back()->with('success', __('All conversations marked as read.'));
    }

    /**
     * Header messages menu (JSON): latest conversations across every organization the user is
     * in, with the other person's photo, preview, time and unread count.
     */
    public function recent(Request $request, MessagingService $messaging): JsonResponse
    {
        $user = $request->user();
        $conversations = Conversation::query()->forParticipant($user)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->whereNull('archived_at'))
            ->whereNotNull('last_message_at')
            ->with(['users:id,name,avatar_path', 'participants', 'latestMessage', 'organization:id,name'])
            ->orderByDesc('last_message_at')->limit(8)->get();
        $prefix = $user->isClient() ? 'portal.messages' : 'messages';

        return response()->json([
            'unread' => $messaging->totalUnread($user),
            'inbox_url' => route($prefix.'.index'),
            'items' => $conversations->map(function (Conversation $c) use ($user, $messaging, $prefix) {
                $other = $c->users->firstWhere('id', '!=', $user->id);

                return [
                    'id' => $c->id,
                    'name' => $other?->name ?? __('Conversation'),
                    'avatar' => PublicFile::url($other?->avatar_path),
                    'preview' => $c->latestMessage ? ($c->latestMessage->body ? str($c->latestMessage->body)->limit(70)->toString() : __('Attachment: :name', ['name' => $c->latestMessage->attachment_name])) : null,
                    'mine' => $c->latestMessage?->sender_id === $user->id,
                    'at' => $c->last_message_at?->toIso8601String(),
                    'unread' => $messaging->unreadCount($c, $user),
                    'context' => $c->kind === 'direct' ? __('Direct message') : ($c->subject ?? $c->organization?->name),
                    'url' => route($prefix.'.show', $c->id),
                ];
            }),
        ]);
    }

    /** Mark one conversation read from the header menu (any area). */
    public function markReadJson(Request $request, Conversation $conversation, MessagingService $messaging): JsonResponse
    {
        $this->authorize('participate', $conversation);
        $messaging->markRead($conversation, $request->user());

        return response()->json(['unread' => $messaging->totalUnread($request->user())]);
    }

    /**
     * AJAX lawyer search for lawyer-to-lawyer messaging: listed advocates (and colleagues in the
     * current organization), by name, firm, city or specialization. Debounced client-side,
     * paginated server-side; returns only public directory fields.
     */
    public function searchLawyers(Request $request): JsonResponse
    {
        $user = $request->user();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'specialization' => ['nullable', 'string', 'max:80'],
            'firm' => ['nullable', 'string', 'max:120'],
        ]);
        $colleagueIds = $this->organization()->activeMembers()->pluck('user_id');

        $profiles = LawyerProfile::query()
            ->where(fn ($q) => $q->listed()->orWhereIn('user_id', $colleagueIds))
            ->where('user_id', '!=', $user->id)
            ->with(['user:id,name,avatar_path', 'city:id,name', 'specializations:id,name', 'user.memberships' => fn ($q) => $q->where('status', 'active')->whereHas('organization', fn ($o) => $o->where('type', 'firm')), 'user.memberships.organization:id,name'])
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%")))
            ->when($filters['city'] ?? null, fn ($q, $city) => $q->whereHas('city', fn ($c) => $c->where('name', 'like', "%{$city}%")))
            ->when($filters['specialization'] ?? null, fn ($q, $spec) => $q->whereHas('specializations', fn ($s) => $s->where('name', 'like', "%{$spec}%")))
            ->when($filters['firm'] ?? null, fn ($q, $firm) => $q->whereHas('user.organizations', fn ($o) => $o->where('type', 'firm')->where('name', 'like', "%{$firm}%")))
            ->orderBy(User::select('name')->whereColumn('users.id', 'lawyer_profiles.user_id'))
            ->paginate(12)->withQueryString();

        return response()->json([
            'data' => collect($profiles->items())->map(fn (LawyerProfile $p) => [
                'user_id' => $p->user_id,
                'name' => $p->user->name,
                'avatar' => PublicFile::url($p->photo_path) ?? PublicFile::url($p->user->avatar_path),
                'headline' => $p->headline,
                'city' => $p->city?->name,
                'firm' => $p->user->memberships->first()?->organization?->name,
                'specializations' => $p->specializations->pluck('name')->take(3)->values(),
                'verified' => $p->isVerified(),
                'colleague' => $colleagueIds->contains($p->user_id),
            ]),
            'next_page' => $profiles->hasMorePages() ? $profiles->currentPage() + 1 : null,
        ]);
    }

    /** Opens (or reuses) a direct conversation with another lawyer. */
    public function startDirect(Request $request, MessagingService $messaging): RedirectResponse
    {
        $validated = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);
        $conversation = $messaging->startDirect($request->user(), User::findOrFail($validated['user_id']));

        return redirect()->route('messages.show', $conversation);
    }

    public function archive(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorize('participate', $conversation);
        $participant = $conversation->participants()->where('user_id', $request->user()->id)->firstOrFail();
        $participant->update(['archived_at' => $participant->archived_at ? null : now()]);

        return redirect()->route($this->prefix($request).'.index');
    }

    public function attachment(Request $request, Conversation $conversation, Message $message): StreamedResponse
    {
        $this->authorize('participate', $conversation);
        abort_unless($message->conversation_id === $conversation->id && $message->attachment_path, 404);

        return Storage::disk(config('legal.uploads.disk'))->download($message->attachment_path, $message->attachment_name, ['Cache-Control' => 'private, no-store']);
    }

    /**
     * Lawyers a client can start a conversation with: on their shared cases or from their bookings.
     *
     * @return list<array<string, mixed>>
     */
    private function clientStarters(User $user): array
    {
        // Lawyers on the client's shared cases plus lawyers they have booked a consultation with.
        return Client::query()->where('user_id', $user->id)->with(['organization:id,name', 'cases' => fn ($q) => $q->where('share_with_client', true)->with('lawyers:id,name'), 'appointments.lawyer:id,name'])->get()
            ->flatMap(fn (Client $c) => $c->cases->flatMap->lawyers->concat($c->appointments->pluck('lawyer')->filter())->unique('id')->map(fn ($l) => ['client_id' => $c->id, 'lawyer_id' => $l->id, 'label' => $l->name.', '.$c->organization->name]))
            ->unique(fn ($s) => $s['client_id'].'-'.$s['lawyer_id'])->values()->all();
    }
}
