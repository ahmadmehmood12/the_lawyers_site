<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PlanFeature: string
{
    use HasOptions;

    case MaxActiveCases = 'max_active_cases';
    case MaxClients = 'max_clients';
    case MaxTeamMembers = 'max_team_members';
    case StorageMb = 'storage_mb';
    case WhatsAppReminders = 'whatsapp_reminders';
    case AiAssistant = 'ai_assistant';
    case DraftingTemplates = 'drafting_templates';
    case ClientPortal = 'client_portal';
    case Analytics = 'analytics';

    public static function translationGroup(): string
    {
        return 'plan_feature';
    }
}
