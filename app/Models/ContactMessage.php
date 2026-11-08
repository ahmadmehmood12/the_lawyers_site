<?php

namespace App\Models;

use App\Enums\FeedbackCategory;
use App\Enums\SupportMessageKind;
use App\Enums\SupportMessageStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One inbox for "Contact us" messages and signed-in feedback, read only by
 * platform admins with support.manage (docs/Modules/Feedback.md).
 */
#[Fillable(['reference', 'kind', 'user_id', 'account_type', 'name', 'email', 'phone', 'whatsapp_consent', 'locale', 'subject', 'category', 'body', 'status', 'admin_note', 'handled_by', 'handled_at'])]
class ContactMessage extends Model
{
    /** @var array<string, mixed> */
    protected $attributes = [
        'kind' => 'contact',
        'status' => 'new',
        'whatsapp_consent' => false,
        'locale' => 'en',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => SupportMessageKind::class,
            'status' => SupportMessageStatus::class,
            'category' => FeedbackCategory::class,
            'whatsapp_consent' => 'boolean',
            'handled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
