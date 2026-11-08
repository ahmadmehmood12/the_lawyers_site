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
use App\Models\Subscription;
use App\Models\User;
use App\Services\Ai\AiProvider;
use App\Services\WhatsApp\WhatsAppClient;
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
        ]);
    }
}
