<?php

namespace App\Services\Analytics\Sections;

use App\Enums\AccountType;
use App\Enums\DeliveryStatus;
use App\Enums\DraftStatus;
use App\Enums\UserStatus;
use App\Enums\VerificationStatus;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Users, verification, organizations and how much every module is used: a total, the count
 * created in the range and the change against the previous period.
 */
class ModuleAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        $users = DB::table('users');

        return [
            'kpis' => [
                'users' => (int) (clone $users)->count(),
                'signups' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('users'), 'created_at')->count()),
                'active_users' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('users'), 'last_login_at')->count()),
                'verified_email' => $this->percent((clone $users)->whereNotNull('email_verified_at')->count(), (clone $users)->count()),
                'two_factor' => $this->percent((clone $users)->whereNotNull('two_factor_confirmed_at')->count(), (clone $users)->count()),
                'google' => (int) (clone $users)->whereNotNull('google_id')->count(),
                'lawyers_verified' => (int) DB::table('lawyer_profiles')->where('verification_status', 'approved')->count(),
                'verifications_decided' => $this->compare(fn (AnalyticsRange $r) => (int) $r->apply(DB::table('verification_requests')->whereIn('status', ['approved', 'rejected']), 'reviewed_at')->count()),
            ],
            'account_types' => $this->enumCounts($users, 'account_type', AccountType::class),
            'user_statuses' => $this->enumCounts($users, 'status', UserStatus::class),
            'signup_trend' => $this->combine([
                'lawyer' => $this->series(DB::table('users')->where('account_type', 'lawyer'), 'created_at'),
                'client' => $this->series(DB::table('users')->where('account_type', 'client'), 'created_at'),
                'staff' => $this->series(DB::table('users')->where('account_type', 'staff'), 'created_at'),
            ], ['lawyer' => AccountType::Lawyer->label(), 'client' => AccountType::Client->label(), 'staff' => AccountType::Staff->label()]),
            'verification' => $this->enumCounts(DB::table('lawyer_profiles'), 'verification_status', VerificationStatus::class),
            'organizations' => [
                'types' => $this->grouped(DB::table('organizations')->whereNull('deleted_at'), 'type'),
                'statuses' => $this->grouped(DB::table('organizations')->whereNull('deleted_at'), 'status'),
            ],
            'drafts' => $this->enumCounts(DB::table('drafts')->whereNull('deleted_at'), 'status', DraftStatus::class),
            'deliveries' => [
                'channels' => $this->grouped($this->range->apply(DB::table('notification_deliveries'), 'created_at'), 'channel'),
                'statuses' => $this->enumCounts($this->range->apply(DB::table('notification_deliveries'), 'created_at'), 'status', DeliveryStatus::class),
            ],
            'ai' => [
                'features' => $this->grouped($this->range->apply(DB::table('ai_requests'), 'created_at'), 'feature'),
                'tokens' => (int) $this->range->apply(DB::table('ai_requests'), 'created_at')->sum(DB::raw('COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)')),
            ],
            'modules' => $this->modules(),
        ];
    }

    /** @return array{value: float|null, count: int} */
    private function percent(int $part, int $total): array
    {
        return ['value' => $total > 0 ? round(($part / $total) * 100, 1) : null, 'count' => $part];
    }

    /**
     * Every module: total records, created in the range, previous period, change, and the
     * admin page to open when one exists.
     *
     * @return list<array{key: string, group: string, label: string, total: int, current: int, previous: int, change: float|null, href: string|null}>
     */
    private function modules(): array
    {
        $definitions = [
            // [key, group, label, table builder, date column, admin route]
            ['users', 'People', __('User accounts'), fn () => DB::table('users'), 'created_at', 'admin.users.index'],
            ['lawyers', 'People', __('Lawyer profiles'), fn () => DB::table('lawyer_profiles'), 'created_at', 'admin.verifications.index'],
            ['organizations', 'People', __('Law firms and chambers'), fn () => DB::table('organizations')->whereNull('deleted_at'), 'created_at', 'admin.organizations.index'],
            ['members', 'People', __('Team members'), fn () => DB::table('organization_members')->where('status', 'active'), 'created_at', null],
            ['clients', 'Practice', __('Clients'), fn () => DB::table('clients')->whereNull('deleted_at'), 'created_at', null],
            ['cases', 'Practice', __('Cases'), fn () => DB::table('legal_cases')->whereNull('deleted_at'), 'created_at', null],
            ['hearings', 'Practice', __('Hearings'), fn () => DB::table('hearings'), 'created_at', null],
            ['diary', 'Practice', __('Court diary entries'), fn () => DB::table('diary_entries'), 'created_at', null],
            ['calendar', 'Practice', __('Calendar events'), fn () => DB::table('calendar_events'), 'created_at', null],
            ['tasks', 'Practice', __('Tasks'), fn () => DB::table('tasks'), 'created_at', null],
            ['time', 'Practice', __('Time entries'), fn () => DB::table('time_entries'), 'created_at', null],
            ['documents', 'Work', __('Documents'), fn () => DB::table('documents')->whereNull('deleted_at'), 'created_at', null],
            ['drafts', 'Work', __('Legal drafts'), fn () => DB::table('drafts')->whereNull('deleted_at'), 'created_at', null],
            ['templates', 'Work', __('Drafting templates'), fn () => DB::table('document_templates'), 'created_at', 'admin.templates.index'],
            ['ai', 'Work', __('AI assistant requests'), fn () => DB::table('ai_requests'), 'created_at', null],
            ['appointments', 'Communication', __('Appointments'), fn () => DB::table('appointments'), 'created_at', 'admin.appointments.index'],
            ['conversations', 'Communication', __('Conversations'), fn () => DB::table('conversations'), 'created_at', null],
            ['messages', 'Communication', __('Messages'), fn () => DB::table('messages'), 'created_at', null],
            ['notifications', 'Communication', __('Notifications sent'), fn () => DB::table('notification_deliveries'), 'created_at', 'admin.notifications.index'],
            ['invoices', 'Finance', __('Invoices'), fn () => DB::table('invoices'), 'created_at', null],
            ['payments', 'Finance', __('Client payments'), fn () => DB::table('payments'), 'created_at', null],
            ['expenses', 'Finance', __('Case expenses'), fn () => DB::table('case_expenses'), 'created_at', null],
            ['subscriptions', 'Finance', __('Subscriptions'), fn () => DB::table('subscriptions'), 'created_at', 'admin.plans.index'],
            ['plan_payments', 'Finance', __('Plan payments'), fn () => DB::table('plan_payments'), 'created_at', 'admin.payments.index'],
            ['articles', 'Content', __('Articles'), fn () => DB::table('articles')->whereNull('deleted_at'), 'created_at', 'admin.articles.index'],
            ['comments', 'Content', __('Article comments'), fn () => DB::table('article_comments'), 'created_at', 'admin.articles.index'],
            ['likes', 'Content', __('Article likes'), fn () => DB::table('article_likes'), 'created_at', null],
            ['reviews', 'Content', __('Lawyer reviews'), fn () => DB::table('reviews'), 'created_at', 'admin.reviews.index'],
            ['judgments', 'Content', __('Reported judgments'), fn () => DB::table('reported_judgments'), 'created_at', 'admin.judgments.index'],
            ['testimonials', 'Content', __('Testimonials'), fn () => DB::table('testimonials'), 'created_at', 'admin.testimonials.index'],
            ['faqs', 'Content', __('FAQs'), fn () => DB::table('faqs'), 'created_at', 'admin.faqs.index'],
            ['favourites', 'Content', __('Saved lawyers'), fn () => DB::table('favourite_lawyers'), 'created_at', null],
            ['feedback', 'Support', __('Feedback and contact messages'), fn () => DB::table('contact_messages'), 'created_at', 'admin.feedback.index'],
            ['complaints', 'Support', __('Complaints'), fn () => DB::table('complaints'), 'created_at', 'admin.complaints.index'],
            ['verification_requests', 'Support', __('Verification requests'), fn () => DB::table('verification_requests'), 'created_at', 'admin.verifications.index'],
        ];

        $groups = ['People' => __('People'), 'Practice' => __('Practice'), 'Work' => __('Work'), 'Communication' => __('Communication'), 'Finance' => __('Finance'), 'Content' => __('Content'), 'Support' => __('Support')];

        return array_map(function (array $definition) use ($groups) {
            [$key, $group, $label, $builder, $column, $route] = $definition;
            /** @var callable(): Builder $builder */
            $current = (int) $this->range->apply($builder(), $column)->count();
            $previous = (int) $this->range->previous()->apply($builder(), $column)->count();

            return [
                'key' => $key,
                'group' => $groups[$group],
                'label' => $label,
                'total' => (int) $builder()->count(),
                'current' => $current,
                'previous' => $previous,
                'change' => $this->change($current, $previous),
                'href' => $route ? route($route) : null,
            ];
        }, $definitions);
    }
}
