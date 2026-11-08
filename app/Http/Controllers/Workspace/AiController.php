<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Models\AiRequest;
use App\Models\LegalCase;
use App\Services\Access\OrganizationAccess;
use App\Services\Ai\LegalAssistant;
use App\Services\Subscriptions\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/** AI drafting/research assistant (docs/Modules/AI-Assistant.md). */
class AiController extends Controller
{
    private function guard(Request $request): void
    {
        abort_unless(app(OrganizationAccess::class)->allows($request->user(), $this->organization(), 'ai.use'), 403);
    }

    public function index(Request $request, LegalAssistant $assistant, SubscriptionService $subscriptions): Response
    {
        $this->guard($request);
        $organization = $this->organization();
        $limit = $subscriptions->limit($organization, PlanFeature::AiAssistant);

        return Inertia::render('Workspace/Ai/Index', [
            'available' => $assistant->available(),
            'planAllows' => $subscriptions->enabled($organization, PlanFeature::AiAssistant),
            'usage' => ['used' => $this->usedThisMonth($organization->id), 'limit' => $limit],
            'features' => LegalAssistant::FEATURES,
            'cases' => LegalCase::query()->visibleTo($request->user(), $organization)->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
        ]);
    }

    public function run(Request $request, LegalAssistant $assistant, SubscriptionService $subscriptions): JsonResponse
    {
        $this->guard($request);
        $organization = $this->organization();
        $validated = $request->validate([
            'feature' => ['required', Rule::in(LegalAssistant::FEATURES)],
            'input' => ['required', 'string', 'min:10', 'max:60000'],
            'legal_case_id' => ['nullable', 'integer'],
        ]);

        if (! $assistant->available()) {
            return response()->json(['message' => __('The AI assistant is not configured on this platform yet.')], 503);
        }

        $limit = $subscriptions->limit($organization, PlanFeature::AiAssistant);
        if ($limit !== null && $this->usedThisMonth($organization->id) >= $limit) {
            return response()->json(['message' => __('Your plan’s monthly AI limit has been reached.')], 402);
        }

        $case = null;
        $names = [];
        if (! empty($validated['legal_case_id'])) {
            $case = LegalCase::query()->forOrganization($organization)->with(['clients:id,name', 'parties:id,legal_case_id,name'])->findOrFail($validated['legal_case_id']);
            $this->authorize('view', $case);
            $names = [...$case->clients->pluck('name')->all(), ...$case->parties->pluck('name')->all()];
        }

        try {
            $result = $assistant->run($request->user(), $organization, $validated['feature'], $validated['input'], $case, $names);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => __('The AI request failed. Please try again later.')], 502);
        }

        return response()->json([
            'text' => $result['text'],
            'redacted' => $result['redacted'],
            'notice' => __('AI-generated draft. Unverified — check every fact and legal reference against official sources before use.'),
        ]);
    }

    private function usedThisMonth(int $organizationId): int
    {
        return AiRequest::query()->where('organization_id', $organizationId)->where('status', 'completed')->where('created_at', '>=', now()->startOfMonth())->count();
    }
}
