<?php

namespace App\Support;

use App\Models\Activity;
use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Document;
use App\Models\Draft;
use App\Models\Hearing;
use App\Models\Invoice;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Turns raw audit entries into sentences people can read: "Ahmad Raza opened a new
 * case: State vs. Rashid Ahmed". Used by the firm activity feed, the header bell,
 * the dashboard and the admin audit log (docs/Modules/Activity-Feed.md).
 *
 * Audience "organization" names the record (case title, client name) because the
 * reader is a member allowed to see it. Audience "platform" (admin audit) names only
 * references and the firm, never case content.
 */
class ActivityPresenter
{
    /** Eager loads for a page of activities. */
    public static function eagerLoad(Builder $query): Builder
    {
        return $query->with([
            'causer' => fn ($q) => $q->select(['id', 'name', 'avatar_path']),
            'subject' => fn (MorphTo $morph) => $morph->morphWith([
                Hearing::class => ['legalCase:id,title,reference'],
                LawyerProfile::class => ['user:id,name'],
                Payment::class => ['invoice:id,number'],
            ]),
        ]);
    }

    /**
     * @return array{id: int, sentence: string, actor: string, actor_avatar: string|null, icon: string, url: string|null, log: string, created_at: string}
     */
    public static function present(Activity $activity, string $audience = 'organization'): array
    {
        $actor = $activity->causer instanceof User ? $activity->causer->name : __('The system');
        $subject = self::subjectName($activity, $audience);
        $changes = (array) ($activity->properties['attributes'] ?? []);
        $old = (array) ($activity->properties['old'] ?? []);
        $key = self::sentenceKey($activity, $changes, $old);

        $sentence = __($key, [
            'actor' => $actor,
            'subject' => $subject,
            'status' => self::humanize((string) ($changes['status'] ?? '')),
            'date' => isset($changes['hearing_date']) ? (string) Str::of((string) $changes['hearing_date'])->before('T')->before(' ') : '',
            'action' => self::humanize($activity->description),
        ]);

        return [
            'id' => $activity->id,
            'sentence' => $sentence,
            'actor' => $actor,
            'actor_avatar' => $activity->causer instanceof User && $activity->causer->avatar_path ? Storage::disk('public')->url($activity->causer->avatar_path) : null,
            'icon' => self::icon($activity),
            'url' => $audience === 'organization' ? self::url($activity) : null,
            'log' => (string) $activity->log_name,
            'created_at' => $activity->created_at->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $changes
     * @param  array<string, mixed>  $old
     */
    private static function sentenceKey(Activity $activity, array $changes, array $old): string
    {
        $type = $activity->subject_type ? class_basename($activity->subject_type) : null;
        $event = $activity->description;

        return match (true) {
            $type === 'LegalCase' && $event === 'created' => ':actor opened a new case: :subject',
            $type === 'LegalCase' && $event === 'deleted' => ':actor deleted the case :subject',
            $type === 'LegalCase' && array_key_exists('archived_at', $changes) => $changes['archived_at'] ? ':actor archived the case :subject' : ':actor restored the case :subject',
            $type === 'LegalCase' && array_key_exists('status', $changes) => ':actor changed the status of :subject to :status',
            $type === 'LegalCase' => ':actor updated the case :subject',

            $type === 'Hearing' && $event === 'created' => ':actor scheduled a hearing in :subject for :date',
            $type === 'Hearing' && (array_key_exists('order_passed', $changes) || ($changes['status'] ?? null) === 'held') => ':actor recorded the proceedings in :subject',
            $type === 'Hearing' && array_key_exists('hearing_date', $changes) => ':actor moved the hearing in :subject to :date',
            $type === 'Hearing' && ($changes['status'] ?? null) === 'cancelled' => ':actor cancelled a hearing in :subject',
            $type === 'Hearing' => ':actor updated a hearing in :subject',

            $type === 'Invoice' && $event === 'created' => ':actor raised invoice :subject',
            $type === 'Invoice' && array_key_exists('status', $changes) => ':actor marked invoice :subject as :status',
            $type === 'Invoice' => ':actor updated invoice :subject',
            $event === 'payment_recorded' => ':actor recorded a payment against :subject',
            $event === 'refund_recorded' => ':actor recorded a refund against :subject',

            $type === 'Client' && $event === 'created' => ':actor added a new client: :subject',
            $type === 'Client' && $event === 'deleted' => ':actor removed the client :subject',
            $type === 'Client' => ':actor updated the client :subject',

            $type === 'Task' && $event === 'created' => ':actor created the task :subject',
            $type === 'Task' && ($changes['status'] ?? null) === 'done' => ':actor completed the task :subject',
            $type === 'Task' => ':actor updated the task :subject',

            $type === 'Document' && $event === 'created' => ':actor uploaded :subject',
            $type === 'Document' && $event === 'deleted' => ':actor deleted the document :subject',
            $type === 'Document' => ':actor updated the document :subject',

            $type === 'Draft' && $event === 'created' => ':actor started the draft :subject',
            $type === 'Draft' && ($changes['status'] ?? null) === 'approved' => ':actor approved the draft :subject',
            $type === 'Draft' && ($changes['status'] ?? null) === 'in_review' => ':actor sent the draft :subject for review',
            $type === 'Draft' => ':actor revised the draft :subject',
            $event === 'draft_pdf' || $event === 'draft_docx' => ':actor exported the draft :subject',

            $event === 'diary_pdf' => ':actor printed the court diary',
            $event === 'invoices_csv' => ':actor exported invoices',
            $event === 'membership_updated' => ':actor changed a team member’s role',
            $event === 'logo_updated' => ':actor updated the logo of :subject',
            $event === 'avatar_updated' => ':actor updated their profile photo',
            $event === 'verification_approved' => ':actor approved the verification of :subject',
            $event === 'verification_rejected' => ':actor rejected the verification of :subject',
            $event === 'verification_under_review' => ':actor started reviewing the verification of :subject',
            $event === 'verification_document_viewed' => ':actor viewed a verification document of :subject',
            $event === 'organization_status_changed' => ':actor changed the status of :subject',
            $event === 'user_status_changed' => ':actor changed the account status of :subject',
            $event === 'roles_changed' => ':actor changed the roles of :subject',
            $event === 'role_saved' => ':actor saved the role :subject',
            $event === 'role_deleted' => ':actor deleted a role',
            $event === 'staff_created' => ':actor added :subject to the platform team',
            $event === 'plan_assigned' => ':actor assigned a plan to :subject',
            $event === 'settings_changed' => ':actor changed the platform settings',
            $event === 'branding_settings_changed' => ':actor updated the site branding',
            $event === 'mail_settings_changed' => ':actor updated the email settings',
            $event === 'mail_test_sent' => ':actor sent a test email',
            $event === 'whatsapp_settings_changed' => ':actor updated the WhatsApp settings',
            $event === 'support_message_updated' => ':actor updated feedback :subject',

            default => ':actor :action :subject',
        };
    }

    private static function subjectName(Activity $activity, string $audience): string
    {
        $s = $activity->subject;
        $private = $audience === 'platform';

        return match (true) {
            $s instanceof LegalCase => $private ? (string) $s->reference : $s->title,
            $s instanceof Hearing => $s->legalCase ? ($private ? (string) $s->legalCase->reference : $s->legalCase->title) : __('a case'),
            $s instanceof Invoice => (string) $s->number,
            $s instanceof Payment => (string) ($s->invoice?->number ?? $s->receipt_number),
            $s instanceof Client => $private ? __('client #:id', ['id' => $s->id]) : $s->name,
            $s instanceof Task => $private ? __('task #:id', ['id' => $s->id]) : $s->title,
            $s instanceof Document => $private ? __('document #:id', ['id' => $s->id]) : $s->title,
            $s instanceof Draft => $private ? __('draft #:id', ['id' => $s->id]) : $s->title,
            $s instanceof LawyerProfile => (string) $s->user?->name,
            $s instanceof Organization => $s->name,
            $s instanceof User => $s->name,
            $s instanceof ContactMessage => (string) $s->reference,
            $s !== null && method_exists($s, 'getAttribute') && $s->getAttribute('name') => (string) $s->getAttribute('name'),
            $activity->subject_type !== null => __('a deleted record'),
            default => '',
        };
    }

    private static function url(Activity $activity): ?string
    {
        $s = $activity->subject;

        return match (true) {
            $s instanceof LegalCase => route('cases.show', $s->id),
            $s instanceof Hearing => route('cases.show', ['case' => $s->legal_case_id, 'tab' => 'hearings']),
            $s instanceof Invoice => route('invoices.show', $s->id),
            $s instanceof Payment => route('invoices.show', $s->invoice_id),
            $s instanceof Client => route('clients.show', $s->id),
            $s instanceof Draft => route('drafts.edit', $s->id),
            default => null,
        };
    }

    private static function icon(Activity $activity): string
    {
        return match ((string) $activity->log_name) {
            'cases' => 'briefcase',
            'hearings' => 'calendar',
            'finance', 'billing' => 'wallet',
            'clients' => 'users',
            'tasks' => 'check',
            'documents', 'exports' => 'file',
            'drafts' => 'pen',
            'verification' => 'shield',
            default => 'activity',
        };
    }

    private static function humanize(string $value): string
    {
        return Str::of($value)->replace('_', ' ')->lower()->toString();
    }
}
