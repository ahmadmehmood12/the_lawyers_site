<?php

namespace Tests\Feature\Workspace;

use App\Enums\CaseStatus;
use App\Enums\CaseType;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use App\Services\Cases\CaseService;
use App\Services\Hearings\HearingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Every workspace screen renders for an owner with realistic data.
 * Catches query/serialization errors across the module surface.
 */
class WorkspacePagesTest extends TestCase
{
    use RefreshDatabase;

    private User $lawyer;

    private int $caseId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedPlatform();

        $this->lawyer = $this->lawyer();
        $organization = $this->org($this->lawyer);
        $client = $organization->clients()->create(['type' => 'individual', 'name' => 'Test Client', 'preferred_locale' => 'en']);
        $this->actingAs($this->lawyer);

        $case = app(CaseService::class)->create($organization, $this->lawyer, [
            'title' => 'Ali vs. State', 'case_type' => CaseType::Criminal->value, 'status' => CaseStatus::Filed->value,
            'priority' => 'normal', 'client_ids' => [$client->id],
        ]);
        app(HearingService::class)->schedule($case, ['hearing_date' => today()->toDateString(), 'hearing_type' => 'regular'], $this->lawyer);
        $this->caseId = $case->id;
    }

    /**
     * @return array<string, array{0: string, 1?: array<string, mixed>}>
     */
    public static function pages(): array
    {
        return [
            'dashboard' => ['dashboard'],
            'clients' => ['clients.index'],
            'client create' => ['clients.create'],
            'cases' => ['cases.index'],
            'case create' => ['cases.create'],
            'diary day' => ['diary.index'],
            'diary week' => ['diary.index', ['view' => 'week']],
            'diary month' => ['diary.index', ['view' => 'month']],
            'diary agenda' => ['diary.index', ['view' => 'agenda']],
            'tasks' => ['tasks.index'],
            'documents' => ['documents.index'],
            'team' => ['team.index'],
            'profile' => ['lawyer.profile.edit'],
            'verification' => ['lawyer.verification.show'],
            'account' => ['account.edit'],
            'notifications' => ['notifications.index'],
            'messages' => ['messages.index'],
            'appointments' => ['appointments.index'],
            'invoices' => ['invoices.index'],
            'invoice create' => ['invoices.create'],
            'drafts' => ['drafts.index'],
            'draft create' => ['drafts.create'],
            'ai' => ['ai.index'],
            'analytics' => ['analytics.index'],
            'settings' => ['settings.organization'],
            'my articles' => ['lawyer.articles.index'],
        ];
    }

    #[DataProvider('pages')]
    public function test_page_renders(string $route, array $params = []): void
    {
        $this->get(route($route, $params))->assertOk();
    }

    public function test_case_tabs_render(): void
    {
        foreach (['overview', 'parties', 'hearings', 'documents', 'tasks', 'finance', 'communications', 'timeline', 'audit'] as $tab) {
            $this->get(route('cases.show', ['case' => $this->caseId, 'tab' => $tab]))->assertOk();
        }
        $this->get(route('cases.edit', $this->caseId))->assertOk();
    }

    public function test_dashboard_deferred_props_resolve(): void
    {
        $version = app(HandleInertiaRequests::class)->version(request());
        $this->get(route('dashboard'), [
            'X-Inertia' => 'true', 'X-Inertia-Version' => (string) $version,
            'X-Inertia-Partial-Component' => 'Workspace/Dashboard', 'X-Inertia-Partial-Data' => 'upcoming,tasks,breakdown,activity',
        ])->assertOk()->assertJsonPath('props.breakdown.byCourt.0.value', 1);
    }

    public function test_diary_pdf_downloads(): void
    {
        $this->get(route('diary.pdf'))->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }
}
