<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ConversationPolicy
{
    /** Only participants can read or post — no organization-wide snooping on client chats. */
    public function participate(User $user, Conversation $conversation): Response
    {
        return $conversation->hasParticipant($user) ? Response::allow() : Response::denyAsNotFound();
    }
}
