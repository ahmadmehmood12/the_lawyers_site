<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Thrown when a firm tries to go past its plan (SubscriptionService::ensureCanAdd). Page requests go
 * back with the `upgrade` flash, which opens the Upgrade modal; JSON requests get 402 with the offer.
 */
class PlanLimitReached extends Exception
{
    /** @param array<string, mixed> $offer */
    public function __construct(public array $offer)
    {
        parent::__construct((string) ($offer['message'] ?? 'Plan limit reached.'));
    }

    public function render(Request $request): JsonResponse|RedirectResponse
    {
        // Mobile API: same 402 + upgrade offer, in the API envelope.
        if ($request->is('api/v1/*')) {
            return response()->json(['status' => 'Failed', 'timestamp' => now()->format('Y-m-d H:i:s'), 'message' => $this->getMessage(), 'upgrade' => $this->offer], 402);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => $this->getMessage(), 'upgrade' => $this->offer], 402);
        }

        return back()->with('upgrade', $this->offer);
    }
}
