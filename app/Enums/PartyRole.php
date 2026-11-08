<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PartyRole: string
{
    use HasOptions;

    case Plaintiff = 'plaintiff';
    case Defendant = 'defendant';
    case Applicant = 'applicant';
    case Respondent = 'respondent';
    case Petitioner = 'petitioner';
    case Appellant = 'appellant';
    case Complainant = 'complainant';
    case Accused = 'accused';
    case Other = 'other';

    public static function translationGroup(): string
    {
        return 'party_role';
    }
}
