<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Private: owner (and the assigned member) only. Team: members of the organization
 * who can see the linked case (or everyone in it when no case is linked).
 * Client: also shown in the linked client's portal calendar.
 */
enum CalendarVisibility: string
{
    use HasOptions;

    case Private = 'private';
    case Team = 'team';
    case Client = 'client';

    public static function translationGroup(): string
    {
        return 'calendar_visibility';
    }
}
