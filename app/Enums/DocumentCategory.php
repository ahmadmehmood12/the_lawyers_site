<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DocumentCategory: string
{
    use HasOptions;

    case Pleading = 'pleading';
    case Evidence = 'evidence';
    case CourtOrder = 'court_order';
    case Correspondence = 'correspondence';
    case Identity = 'identity';
    case Agreement = 'agreement';
    case Draft = 'draft';
    case Receipt = 'receipt';
    case Other = 'other';

    public static function translationGroup(): string
    {
        return 'document_category';
    }
}
