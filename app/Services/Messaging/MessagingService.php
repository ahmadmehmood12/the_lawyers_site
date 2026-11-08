<?php

namespace App\Services\Messaging;

use App\Models\Client;
use App\Models\Conversation;
use App\Models\LegalCase;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessage;
use App\Services\Access\OrganizationAccess;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lawyer ↔ client one-to-one messaging (docs/Modules/Communication.md).
 * A conversation always belongs to one organization and one client record;
 * participants are exactly the professional and the client's portal account.
 */
class MessagingService
{
    public const ATTACHMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    public function __construct(private OrganizationAccess $access) {}

    public function startFromProfessional(User $professional, Client $client, ?LegalCase $case, ?string $subject): Conversation
    {
        if (! $this->access->allows($professional, $client->organization_id, 'messages.client')) {
            abort(403);
        }

        if (! $client->user_id) {
            throw ValidationException::withMessages(['client_id' => __('This client has no portal account yet. Invite them to the client portal first.')]);
        }

        if ($case && (int) $case->organization_id !== (int) $client->organization_id) {
            abort(404);
        }

        return $this->findOrCreate($client, $professional, $client->user, $case, $subject);
    }

    /** Clients may only message professionals in organizations where they hold a client record. */
    public function startFromClient(User $clientUser, User $lawyer, Client $client, ?string $subject): Conversation
    {
        if ($client->user_id !== $clientUser->id || ! $this->access->isMember($lawyer, $client->organization_id)) {
            abort(404);
        }

        return $this->findOrCreate($client, $lawyer, $clientUser, null, $subject);
    }

    public function send(Conversation $conversation, User $sender, ?string $body, ?UploadedFile $file): Message
    {
        if (blank($body) && ! $file) {
            throw ValidationException::withMessages(['body' => __('Write a message or attach a file.')]);
        }

        $attachment = [];
        if ($file) {
            if (! in_array($file->getMimeType(), self::ATTACHMENT_MIMES, true)) {
                throw ValidationException::withMessages(['attachment' => __('This file type is not allowed.')]);
            }
            $attachment = [
                'attachment_path' => $file->storeAs('messages/'.$conversation->organization_id, Str::random(40).'.'.$file->guessExtension(), ['disk' => config('legal.uploads.disk')]),
                'attachment_name' => Str::limit(basename($file->getClientOriginalName()), 200, ''),
                'attachment_mime' => $file->getMimeType(),
                'attachment_size' => $file->getSize(),
            ];
        }

        return DB::transaction(function () use ($conversation, $sender, $body, $attachment): Message {
            $message = $conversation->messages()->create(['sender_id' => $sender->id, 'body' => $body, ...$attachment]);
            $conversation->forceFill(['last_message_at' => now()])->save();
            $conversation->participants()->where('user_id', $sender->id)->update(['last_read_at' => now(), 'archived_at' => null]);
            $conversation->participants()->where('user_id', '!=', $sender->id)->update(['archived_at' => null]);

            DB::afterCommit(function () use ($conversation, $sender, $message): void {
                $conversation->users()->where('users.id', '!=', $sender->id)->get()->each(fn (User $u) => $u->notify(new NewMessage($message, $sender, $u->isClient())));
            });

            return $message;
        });
    }

    public function unreadCount(Conversation $conversation, User $user): int
    {
        $participant = $conversation->participants->firstWhere('user_id', $user->id);

        return $conversation->messages()->where('sender_id', '!=', $user->id)
            ->when($participant?->last_read_at, fn ($q, $at) => $q->where('created_at', '>', $at))->count();
    }

    private function findOrCreate(Client $client, User $professional, User $clientUser, ?LegalCase $case, ?string $subject): Conversation
    {
        $existing = Conversation::query()->forOrganization($client->organization_id)
            ->where('client_id', $client->id)->where('legal_case_id', $case?->id)
            ->forParticipant($professional)->forParticipant($clientUser)->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($client, $professional, $clientUser, $case, $subject): Conversation {
            $conversation = Conversation::create([
                'organization_id' => $client->organization_id, 'client_id' => $client->id, 'legal_case_id' => $case?->id,
                'subject' => $subject ?: ($case?->title ?? __('General')),
            ]);
            $conversation->users()->attach([$professional->id, $clientUser->id]);

            return $conversation;
        });
    }
}
