<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum CaseStatus: string
{
    use HasOptions;

    case Draft = 'draft';
    case Filed = 'filed';
    case UnderTrial = 'under_trial';
    case Evidence = 'evidence';
    case Arguments = 'arguments';
    case ReservedForJudgment = 'reserved';
    case Decided = 'decided';
    case Appealed = 'appealed';
    case Transferred = 'transferred';
    case Stayed = 'stayed';
    case Withdrawn = 'withdrawn';
    case Dismissed = 'dismissed';
    case Disposed = 'disposed';
    case Archived = 'archived';

    public function isClosed(): bool
    {
        return in_array($this, [self::Decided, self::Withdrawn, self::Dismissed, self::Disposed, self::Archived], true);
    }

    /**
     * @return list<string>
     */
    public static function openValues(): array
    {
        return array_values(array_map(fn (self $s) => $s->value, array_filter(self::cases(), fn (self $s) => ! $s->isClosed())));
    }

    public static function translationGroup(): string
    {
        return 'case_status';
    }
}
