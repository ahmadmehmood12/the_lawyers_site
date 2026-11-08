<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\LegalCase;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\MessagingService;
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
        $conversation->participants()->where('user_id', $request->user()->id)->update(['last_read_at' => now()]);

        return $this->render($request, $messaging, $conversation);
    }

    private function render(Request $request, MessagingService $messaging, ?Conversation $active): Response
    {
        $user = $request->user();
        $archived = $request->boolean('archived');
        $search = $request->string('search')->trim()->toString();

        $conversations = Conversation::query()->forParticipant($user)
            ->when(! $this->portal($request), fn ($q) => $q->forOrganization($this->organization()))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->when($archived, fn ($w) => $w->whereNotNull('archived_at'), fn ($w) => $w->whereNull('archived_at')))
            ->when($search, fn ($q) => $q->where(fn ($w) => $w->where('subject', 'like', "%{$search}%")->orWhereHas('users', fn ($u) => $u->where('name', 'like', "%{$search}%"))))
            ->with(['users:id,name', 'participants', 'organization:id,name', 'latestMessage'])
            ->orderByDesc('last_message_at')->orderByDesc('id')->limit(100)->get();

        return Inertia::render('Shared/Messages', [
            'area' => $this->portal($request) ? 'portal' : 'workspace',
            'routePrefix' => $this->prefix($request),
            'conversations' => $conversations->map(fn (Conversation $c) => [
                'id' => $c->id,
                'subject' => $c->subject,
                'with' => $c->users->where('id', '!=', $user->id)->pluck('name')->implode(', '),
                'organization' => $c->organization->name,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
                'preview' => $c->latestMessage ? ($c->latestMessage->body ? str($c->latestMessage->body)->limit(60)->toString() : '📎 '.$c->latestMessage->attachment_name) : null,
                'unread' => $messaging->unreadCount($c, $user),
            ]),
            'active' => $active ? [
                'id' => $active->id,
                'subject' => $active->subject,
                'with' => $active->users()->where('users.id', '!=', $user->id)->pluck('name')->implode(', '),
                'case' => ! $this->portal($request) && $active->legalCase ? ['id' => $active->legalCase->id, 'title' => $active->legalCase->title] : null,
                'archived' => (bool) $active->participants()->where('user_id', $user->id)->value('archived_at'),
                'messages' => $active->messages()->with('sender:id,name')->latest('id')->limit(100)->get()->reverse()->values()->map(fn (Message $m) => [
                    'id' => $m->id, 'body' => $m->body, 'mine' => $m->sender_id === $user->id, 'sender' => $m->sender->name,
                    'attachment' => $m->attachment_path ? ['name' => $m->attachment_name, 'size' => $m->attachment_size, 'url' => route($this->prefix($request).'.attachment', [$active->id, $m->id])] : null,
                    'created_at' => $m->created_at->toIso8601String(),
                    'read' => $m->sender_id === $user->id && $active->participants->where('user_id', '!=', $user->id)->contains(fn ($p) => $p->last_read_at && $p->last_read_at->gte($m->created_at)),
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
     * Lawyers a client can start a conversation with: those on their shared cases.
     *
     * @return list<array<string, mixed>>
     */
    private function clientStarters(User $user): array
    {
        return Client::query()->where('user_id', $user->id)->with(['organization:id,name', 'cases' => fn ($q) => $q->where('share_with_client', true)->with('lawyers:id,name')])->get()
            ->flatMap(fn (Client $c) => $c->cases->flatMap->lawyers->unique('id')->map(fn ($l) => ['client_id' => $c->id, 'lawyer_id' => $l->id, 'label' => $l->name.', '.$c->organization->name]))
            ->unique(fn ($s) => $s['client_id'].'-'.$s['lawyer_id'])->values()->all();
    }
}
