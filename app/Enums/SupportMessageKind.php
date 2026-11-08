<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Where a support message came from: the public contact page or the signed-in feedback page. */
enum SupportMessageKind: string
{
    use HasOptions;

    case Contact = 'contact';
    case Feedback = 'feedback';

    public static function translationGroup(): string
    {
        return 'support_kind';
    }

    /** Prefix of the human reference, e.g. FB-2026-00012. */
    public function prefix(): string
    {
        return $this === self::Feedback ? 'FB' : 'CT';
    }
}
