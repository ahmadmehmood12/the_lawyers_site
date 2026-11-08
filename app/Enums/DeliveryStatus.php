<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DeliveryStatus: string
{
    use HasOptions;

    case Queued = 'queued';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Read = 'read';
    case Failed = 'failed';
    case Skipped = 'skipped';

    public static function translationGroup(): string
    {
        return 'delivery_status';
    }
}
