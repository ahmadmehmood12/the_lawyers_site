<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Role of a member inside an organization (solo practice or law firm).
 * Each role's permissions are defined in config/legal.php → org_roles.
 */
enum OrgRole: string
{
    use HasOptions;

    case Owner = 'owner';
    case SeniorAdvocate = 'senior_advocate';
    case AssociateAdvocate = 'associate_advocate';
    case JuniorAdvocate = 'junior_advocate';
    case LegalAssistant = 'legal_assistant';
    case Clerk = 'clerk';
    case Receptionist = 'receptionist';
    case Accountant = 'accountant';

    public static function translationGroup(): string
    {
        return 'org_role';
    }

    public function isAdvocate(): bool
    {
        return in_array($this, [self::Owner, self::SeniorAdvocate, self::AssociateAdvocate, self::JuniorAdvocate], true);
    }

    /**
     * @return list<string>
     */
    public function permissions(): array
    {
        $configured = config('legal.org_roles.'.$this->value, []);

        return $configured === ['*'] ? config('legal.org_permissions') : $configured;
    }
}
