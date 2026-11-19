<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The mobile app registers (or clears) the signed-in user's Firebase Cloud
 * Messaging device token so push notifications can reach this device.
 * One token per user: the latest device wins. Returns JSON for the app.
 */
class DeviceTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:4096'],
            'platform' => ['nullable', Rule::in(['ios', 'android'])],
        ]);

        $user = $request->user();
        $user->forceFill([
            'fcm_token' => $data['token'],
            'fcm_platform' => $data['platform'] ?? null,
            'fcm_token_updated_at' => now(),
        ])->save();

        return response()->json(['registered' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->forceFill(['fcm_token' => null, 'fcm_platform' => null, 'fcm_token_updated_at' => null])->save();

        return response()->json(['registered' => false]);
    }
}
