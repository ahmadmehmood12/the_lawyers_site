<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountType;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\LawyerProfile;
use App\Models\LegalCase;
use App\Models\NotificationDelivery;
use App\Models\Organization;
use App\Models\Review;
use App\Models\Specialization;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Ai\AiProvider;
use App\Services\WhatsApp\WhatsAppClient;
use App\Support\DirectoryPresenter;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Platform KPIs. Aggregates only — no case content is exposed to platform staff. */
class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $months = collect(range(5, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i));
        $signups = User::query()->where('created_at', '>=', $months->first())->selectRaw("DATE_FORMAT(created_at, '%Y-%m') ym, COUNT(*) c")->groupBy('ym')->pluck('c', 'ym');

        return Inertia::render('Admin/Dashboard', [
            'kpis' => [
                'lawyers' => User::query()->where('account_type', AccountType::Lawyer->value)->count(),
                'clients' => User::query()->where('account_type', AccountType::Client->value)->count(),
                'firms' => Organization::query()->where('type', 'firm')->count(),
                'verified' => LawyerProfile::query()->where('verification_status', VerificationStatus::Approved->value)->count(),
                'pendingVerification' => LawyerProfile::query()->whereIn('verification_status', [VerificationStatus::Submitted->value, VerificationStatus::UnderReview->value])->count(),
                'cases' => LegalCase::query()->count(),
                'paidSubscriptions' => Subscription::query()->whereIn('status', ['active', 'trialing'])->whereHas('plan', fn ($q) => $q->where('price_monthly', '>', 0))->count(),
                'pendingReviews' => Review::query()->where('status', 'pending')->count(),
                'openComplaints' => Complaint::query()->whereIn('status', ['open', 'in_progress'])->count(),
                'deletionRequests' => User::query()->whereNotNull('deletion_requested_at')->count(),
            ],
            'signups' => $months->map(fn ($m) => ['label' => $m->translatedFormat('M y'), 'value' => (int) ($signups[$m->format('Y-m')] ?? 0)])->values(),
            'deliveries' => NotificationDelivery::query()->where('channel', 'whatsapp')->where('created_at', '>=', now()->subDays(30))->select('status', DB::raw('COUNT(*) as c'))->groupBy('status')->pluck('c', 'status'),
            'integrations' => [
                'whatsapp' => app(WhatsAppClient::class)->isConfigured(),
                'ai' => app(AiProvider::class)->isEnabled(),
                'payments' => filled(config('services.payments.gateway')) && filled(config('services.payments.webhook_secret')),
                'mail' => config('mail.default') !== 'log',
            ],
            'directory' => [
                'lawyers' => LawyerProfile::query()->listed()
                    ->where('verification_status', VerificationStatus::Approved->value)
                    ->with([
                        'user:id,name',
                        'user.memberships' => fn ($q) => $q->where('status', 'active')
                            ->whereHas('organization', fn ($o) => $o->where('type', 'firm')->where('is_public', true)),
                        'user.memberships.organization:id,name,slug',
                        'city:id,name,name_ur', 'specializations:id,name,name_ur,slug', 'barCouncil:id,name,code',
                        'educations', 'courts:id,name,name_ur', 'languages',
                    ])
                    ->orderByDesc('rating_average')->limit(3)->get()
                    ->map(fn (LawyerProfile $p) => DirectoryPresenter::lawyer($p)),
                'firms' => Organization::query()->where('type', 'firm')->where('is_public', true)->where('status', 'active')
                    ->with('city:id,name,name_ur')->withCount('activeMembers')
                    ->orderByDesc('active_members_count')->limit(3)->get()
                    ->map(fn (Organization $o) => DirectoryPresenter::firm($o)),
                'practiceAreas' => Specialization::query()->where('is_active', true)
                    ->withCount(['lawyers' => fn ($q) => $q->listed()])
                    ->orderByDesc('lawyers_count')->limit(4)->get()
                    ->map(fn (Specialization $s) => [
                        'slug' => $s->slug,
                        'name' => app()->getLocale() === 'ur' && $s->name_ur ? $s->name_ur : $s->name,
                        'description' => app()->getLocale() === 'ur' && $s->description_ur ? $s->description_ur : $s->description,
                        'icon' => $s->icon,
                        'count' => $s->lawyers_count,
                    ]),
            ],
        ]);
    }
}
